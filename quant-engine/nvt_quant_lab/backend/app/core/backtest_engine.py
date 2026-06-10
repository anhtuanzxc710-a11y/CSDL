import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Any, Tuple

from app.core.resilience import fetch_stock_data_resilient, fetch_index_data_resilient
from app.core.logging_config import generate_request_id, log_exception

class BacktestEngine:
    def __init__(
        self,
        symbols: List[str],
        start_date: str,
        end_date: str,
        initial_capital: float,
        weighting_method: str,
        rebalance_frequency: str,
        transaction_cost_bps: float,
        slippage_bps: float,
        benchmark: str = "VN30",
        risk_free_rate: float = 0.03,
        custom_weights: Dict[str, float] = None,
        request_id: str = None
    ):
        self.symbols = [s.strip().upper() for s in symbols if s.strip()]
        self.start_date = start_date
        self.end_date = end_date
        self.initial_capital = initial_capital
        self.weighting_method = weighting_method
        self.rebalance_frequency = rebalance_frequency
        self.transaction_cost_bps = transaction_cost_bps
        self.slippage_bps = slippage_bps
        self.benchmark = benchmark
        self.risk_free_rate = risk_free_rate
        self.custom_weights = custom_weights or {}
        self.request_id = request_id or generate_request_id()

    def run(self) -> Dict[str, Any]:
        # Parse dates
        try:
            start_dt = pd.to_datetime(self.start_date)
            end_dt = pd.to_datetime(self.end_date)
        except Exception as e:
            raise ValueError(f"Invalid date format: {str(e)}")

        if start_dt > end_dt:
            raise ValueError("Start date must be before or equal to end date.")

        # Calculate days_back dynamically
        today = datetime.now()
        days_back = (today - start_dt).days + 30
        if days_back < 100:
            days_back = 100

        # Load stock price data
        prices_dict = {}
        for s in self.symbols:
            df = fetch_stock_data_resilient(s, days_back=days_back, request_id=self.request_id)
            if not df.empty and 'close' in df.columns:
                prices_dict[s] = df['close']

        if not prices_dict:
            raise ValueError("No historical price data found for the selected symbols.")

        prices_df = pd.DataFrame(prices_dict)
        prices_df = prices_df.loc[start_dt:end_dt]
        prices_df = prices_df.dropna()  # Align trading dates

        if len(prices_df) < 5:
            raise ValueError(f"Too few aligned trading dates ({len(prices_df)}). Try a wider date range.")

        # Get target weights
        weights = {}
        if self.weighting_method == "equal_weight":
            n = len(prices_df.columns)
            weights = {s: 1.0 / n for s in prices_df.columns}
        elif self.weighting_method == "market_cap_placeholder":
            mock_mc = {
                "VCB": 450000, "VHM": 180000, "VIC": 160000, "VNM": 140000, "FPT": 150000,
                "HPG": 130000, "GAS": 170000, "BID": 220000, "CTG": 150000, "TCB": 120000,
                "MBB": 80000, "VPB": 90000, "ACB": 60000, "MWG": 70000, "MSN": 110000,
                "SAB": 95000, "VRE": 50000, "SSI": 45000, "HDB": 40000, "VJC": 105000
            }
            mc_vals = {s: mock_mc.get(s, 30000 + (abs(hash(s)) % 20000)) for s in prices_df.columns}
            total_mc = sum(mc_vals.values())
            weights = {s: mc_vals[s] / total_mc for s in prices_df.columns}
        elif self.weighting_method == "custom_weight":
            for s in prices_df.columns:
                if s not in self.custom_weights:
                    raise ValueError(f"Missing weight for symbol {s} in custom_weights.")
            total_weight = sum(self.custom_weights[s] for s in prices_df.columns)
            if abs(total_weight - 1.0) > 1e-4:
                raise ValueError(f"Custom weights must sum to 1.0 (got {total_weight}).")
            weights = {s: self.custom_weights[s] for s in prices_df.columns}
        else:
            raise ValueError(f"Unsupported weighting method: {self.weighting_method}")

        # Fetch benchmark data
        benchmark_df = fetch_index_data_resilient(self.benchmark, days_back=days_back, request_id=self.request_id)
        benchmark_source = self.benchmark
        is_degraded = False

        if benchmark_df.empty or 'close' not in benchmark_df.columns:
            fallback = "VNINDEX" if self.benchmark == "VN30" else "VN30"
            benchmark_df = fetch_index_data_resilient(fallback, days_back=days_back, request_id=self.request_id)
            if not benchmark_df.empty and 'close' in benchmark_df.columns:
                benchmark_source = fallback
            else:
                benchmark_source = "NONE"
                is_degraded = True

        if not is_degraded:
            bench_prices = benchmark_df['close'].reindex(prices_df.index).ffill().bfill()
            if len(bench_prices) > 0 and bench_prices.iloc[0] > 0:
                benchmark_curve = (bench_prices / bench_prices.iloc[0] * self.initial_capital).tolist()
            else:
                benchmark_curve = [self.initial_capital] * len(prices_df)
                is_degraded = True
                benchmark_source = "NONE"
        else:
            benchmark_curve = [self.initial_capital] * len(prices_df)

        # Determine rebalancing dates
        dates = prices_df.index
        rebal_dates = self.get_rebalance_dates(dates, self.rebalance_frequency)

        # Cost rate (bps / 10000)
        cost_rate = (self.transaction_cost_bps + self.slippage_bps) / 10000.0

        # Simulation state
        cash = self.initial_capital
        holdings = {s: 0.0 for s in prices_df.columns}  # shares
        portfolio_values = []
        drawdowns = []
        daily_returns = []
        trades = []
        rebalance_events = []
        total_tx_costs = 0.0
        total_slip_costs = 0.0

        prev_portfolio_value = self.initial_capital

        for t in dates:
            curr_prices = prices_df.loc[t]

            # Portfolio value before rebalancing on day t
            asset_value = sum(holdings[s] * curr_prices[s] for s in prices_df.columns)
            portfolio_value_t = cash + asset_value

            if t in rebal_dates:
                # Weights before rebalance
                old_weights_dict = {
                    s: (holdings[s] * curr_prices[s] / portfolio_value_t if portfolio_value_t > 0 else 0.0)
                    for s in prices_df.columns
                }

                # Estimate cost
                tentative_trades = {}
                estimated_costs = 0.0
                for s in prices_df.columns:
                    target_val = portfolio_value_t * weights[s]
                    curr_val = holdings[s] * curr_prices[s]
                    trade_val = target_val - curr_val
                    tentative_trades[s] = trade_val
                    estimated_costs += abs(trade_val) * cost_rate

                investable_capital = max(0.0, portfolio_value_t - estimated_costs)

                actual_trades_this_event = []
                event_tx_cost = 0.0
                event_slip_cost = 0.0
                new_holdings = {}

                for s in prices_df.columns:
                    target_val = investable_capital * weights[s]
                    curr_val = holdings[s] * curr_prices[s]
                    trade_val = target_val - curr_val
                    
                    price = curr_prices[s]
                    shares_to_trade = trade_val / price if price > 0 else 0.0
                    notional = abs(trade_val)

                    tx_cost = notional * (self.transaction_cost_bps / 10000.0)
                    slip_cost = notional * (self.slippage_bps / 10000.0)

                    event_tx_cost += tx_cost
                    event_slip_cost += slip_cost
                    total_tx_costs += tx_cost
                    total_slip_costs += slip_cost

                    new_shares = target_val / price if price > 0 else 0.0
                    new_holdings[s] = new_shares

                    if abs(shares_to_trade) > 1e-6:
                        action = "BUY" if shares_to_trade > 0 else "SELL"
                        actual_trades_this_event.append({
                            "date": t.strftime("%Y-%m-%d"),
                            "symbol": s,
                            "action": action,
                            "shares": float(abs(shares_to_trade)),
                            "price": float(price),
                            "notional": float(notional),
                            "transaction_cost": float(tx_cost),
                            "slippage_cost": float(slip_cost)
                        })
                        trades.append(actual_trades_this_event[-1])

                holdings = new_holdings
                actual_cost = event_tx_cost + event_slip_cost
                cash = portfolio_value_t - sum(investable_capital * weights[s] for s in prices_df.columns) - actual_cost
                
                # Recalculate portfolio value after rebalancing
                asset_value = sum(holdings[s] * curr_prices[s] for s in prices_df.columns)
                portfolio_value_t = cash + asset_value

                rebalance_events.append({
                    "date": t.strftime("%Y-%m-%d"),
                    "portfolio_value": float(portfolio_value_t),
                    "old_weights": {k: float(v) for k, v in old_weights_dict.items()},
                    "new_weights": {k: float(v) for k, v in weights.items()},
                    "transaction_cost": float(event_tx_cost),
                    "slippage_cost": float(event_slip_cost),
                    "trades_count": len(actual_trades_this_event)
                })

            daily_ret = (portfolio_value_t / prev_portfolio_value) - 1.0 if prev_portfolio_value > 0 else 0.0
            daily_returns.append(daily_ret)
            prev_portfolio_value = portfolio_value_t
            portfolio_values.append(portfolio_value_t)

        # Calculate drawdowns
        running_max = portfolio_values[0]
        for val in portfolio_values:
            if val > running_max:
                running_max = val
            dd = (val - running_max) / running_max if running_max > 0 else 0.0
            drawdowns.append(dd)

        # Calculate metrics
        metrics = self.calculate_metrics(portfolio_values, daily_returns, drawdowns, benchmark_curve, is_degraded)

        dates_str = [d.strftime("%Y-%m-%d") for d in dates]

        warnings = []
        if is_degraded:
            warnings.append("Dữ liệu Benchmark không khả dụng. Đang chạy ở chế độ Degraded (Không có Benchmark).")

        return {
            "success": True,
            "strategy": {
                "symbols": self.symbols,
                "start_date": self.start_date,
                "end_date": self.end_date,
                "initial_capital": float(self.initial_capital),
                "weighting_method": self.weighting_method,
                "rebalance_frequency": self.rebalance_frequency,
                "transaction_cost_bps": float(self.transaction_cost_bps),
                "slippage_bps": float(self.slippage_bps),
                "benchmark": benchmark_source,
                "risk_free_rate": float(self.risk_free_rate),
                "weights": {k: float(v) for k, v in weights.items()}
            },
            "metrics": {k: (float(v) if v is not None else None) for k, v in metrics.items()},
            "series": {
                "dates": dates_str,
                "equity_curve": [float(x) for x in portfolio_values],
                "drawdown": [float(x) for x in drawdowns],
                "daily_returns": [float(x) for x in daily_returns],
                "benchmark_curve": [float(x) for x in benchmark_curve]
            },
            "trades": trades,
            "rebalance_events": rebalance_events,
            "costs": {
                "total_transaction_costs": float(total_tx_costs),
                "total_slippage_costs": float(total_slip_costs),
                "total_costs": float(total_tx_costs + total_slip_costs)
            },
            "warnings": warnings
        }

    def get_rebalance_dates(self, dates: pd.Index, frequency: str) -> set:
        if frequency == "none":
            return {dates[0]}
        
        rebal_dates = {dates[0]}
        
        if frequency == "monthly":
            for i in range(1, len(dates)):
                if dates[i].month != dates[i-1].month:
                    rebal_dates.add(dates[i])
        elif frequency == "quarterly":
            for i in range(1, len(dates)):
                q_curr = (dates[i].month - 1) // 3
                q_prev = (dates[i-1].month - 1) // 3
                if q_curr != q_prev:
                    rebal_dates.add(dates[i])
        elif frequency == "yearly":
            for i in range(1, len(dates)):
                if dates[i].year != dates[i-1].year:
                    rebal_dates.add(dates[i])
        return rebal_dates

    def calculate_metrics(
        self,
        portfolio_values: List[float],
        daily_returns: List[float],
        drawdowns: List[float],
        benchmark_curve: List[float],
        is_degraded: bool
    ) -> Dict[str, Any]:
        trading_days = len(portfolio_values)
        if trading_days == 0:
            return {}

        final_value = portfolio_values[-1]
        total_return = (final_value / self.initial_capital) - 1.0

        years = trading_days / 252.0
        if years < 1/252.0:
            years = 1/252.0

        ann_return = (1.0 + total_return) ** (1.0 / years) - 1.0

        returns_arr = np.array(daily_returns)
        ann_vol = float(np.std(returns_arr) * np.sqrt(252.0))

        sharpe = (ann_return - self.risk_free_rate) / ann_vol if ann_vol > 0 else 0.0

        downside_returns = returns_arr[returns_arr < 0.0]
        if len(downside_returns) > 0:
            downside_dev = float(np.std(downside_returns) * np.sqrt(252.0))
            sortino = (ann_return - self.risk_free_rate) / downside_dev if downside_dev > 0 else 0.0
        else:
            sortino = 0.0

        max_dd = float(min(drawdowns))
        calmar = ann_return / abs(max_dd) if max_dd != 0 else 0.0
        win_rate = float(np.sum(returns_arr > 0) / len(returns_arr)) if len(returns_arr) > 0 else 0.0

        best_day = float(np.max(returns_arr)) if len(returns_arr) > 0 else 0.0
        worst_day = float(np.min(returns_arr)) if len(returns_arr) > 0 else 0.0

        if not is_degraded and len(benchmark_curve) == len(portfolio_values):
            bench_values = np.array(benchmark_curve)
            bench_returns = np.diff(bench_values) / bench_values[:-1]
            bench_returns = np.insert(bench_returns, 0, 0.0)

            bench_total_return = (benchmark_curve[-1] / benchmark_curve[0]) - 1.0
            bench_ann_return = (1.0 + bench_total_return) ** (1.0 / years) - 1.0

            cov = np.cov(returns_arr, bench_returns)
            if cov.shape == (2, 2) and cov[1, 1] > 0:
                beta = float(cov[0, 1] / cov[1, 1])
            else:
                beta = 1.0

            alpha = ann_return - self.risk_free_rate - beta * (bench_ann_return - self.risk_free_rate)
            active_returns = returns_arr - bench_returns
            tracking_error = float(np.std(active_returns) * np.sqrt(252.0))
            info_ratio = (ann_return - bench_ann_return) / tracking_error if tracking_error > 0 else 0.0
        else:
            beta = None
            alpha = None
            tracking_error = None
            info_ratio = None

        return {
            "total_return": total_return,
            "annualized_return": ann_return,
            "annualized_volatility": ann_vol,
            "sharpe_ratio": sharpe,
            "sortino_ratio": sortino,
            "max_drawdown": max_dd,
            "calmar_ratio": calmar,
            "beta": beta,
            "alpha": alpha,
            "tracking_error": tracking_error,
            "information_ratio": info_ratio,
            "win_rate": win_rate,
            "best_day": best_day,
            "worst_day": worst_day,
            "final_value": final_value
        }
