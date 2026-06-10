import pandas as pd
import numpy as np
from datetime import datetime
from scipy.optimize import minimize
from typing import List, Dict, Any, Tuple, Optional
from app.core.quant_math import (
    estimate_covariance,
    adjust_variance_drag,
    solve_max_sharpe,
    calculate_portfolio_metrics
)

from app.core.resilience import fetch_stock_data_resilient, fetch_index_data_resilient
from app.core.logging_config import generate_request_id, log_exception

class OptimizerEngine:
    def __init__(
        self,
        symbols: List[str],
        start_date: str,
        end_date: str,
        optimizer: str,
        initial_capital: float = 100000000,
        risk_free_rate: float = 0.03,
        min_weight: float = 0.0,
        max_weight: float = 1.0,
        covariance_method: str = "sample",
        benchmark: str = "VN30",
        request_id: str = None
    ):
        self.symbols = [s.strip().upper() for s in symbols if s.strip()]
        self.start_date = start_date
        self.end_date = end_date
        self.optimizer = optimizer
        self.initial_capital = initial_capital
        self.risk_free_rate = risk_free_rate
        self.min_weight = min_weight
        self.max_weight = max_weight
        self.covariance_method = covariance_method
        self.benchmark = benchmark
        self.request_id = request_id or generate_request_id()
        self.warnings = []

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

        # Calculate daily log returns
        returns_df = np.log(prices_df / prices_df.shift(1)).dropna()

        if len(returns_df) < 5:
            raise ValueError("Too few return data points after alignment.")

        n_assets = len(returns_df.columns)
        
        # Check constraint feasibility
        if self.min_weight * n_assets > 1.0 + 1e-4:
            raise ValueError(f"Constraints are infeasible: min_weight ({self.min_weight}) * number of symbols ({n_assets}) > 1.0")
        if self.max_weight * n_assets < 1.0 - 1e-4:
            raise ValueError(f"Constraints are infeasible: max_weight ({self.max_weight}) * number of symbols ({n_assets}) < 1.0")

        # Covariance matrix estimation
        try:
            cov_matrix = estimate_covariance(returns_df, method=self.covariance_method)
        except Exception as e:
            if self.covariance_method == "ledoit_wolf":
                self.warnings.append("Ledoit-Wolf covariance estimation failed. Fallback to sample covariance.")
                cov_matrix = estimate_covariance(returns_df, method="sample")
            else:
                raise e

        # Mean returns (annualized)
        mean_returns = returns_df.mean() * 252
        
        # Variance drag adjustment
        expected_returns = adjust_variance_drag(mean_returns, cov_matrix)

        # Optimization bounds and constraints
        bounds = tuple((self.min_weight, self.max_weight) for _ in range(n_assets))
        eq_cons = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0}
        
        # Helper to compute portfolio metrics
        def get_portfolio_metrics(w):
            return calculate_portfolio_metrics(
                weights=w,
                expected_returns=expected_returns,
                cov_matrix=cov_matrix,
                risk_free_rate=self.risk_free_rate,
                returns_df=returns_df
            )

        # Initial guess (equal weight)
        init_guess = np.array(n_assets * [1.0 / n_assets])

        # Execute optimization
        weights = init_guess
        opt_status = "success"

        if self.optimizer == "equal_weight":
            weights = init_guess
        elif self.optimizer == "min_variance":
            def objective(w):
                return np.dot(w.T, np.dot(cov_matrix, w))
            res = minimize(objective, init_guess, method='SLSQP', bounds=bounds, constraints=eq_cons)
            if res.success:
                weights = res.x
            else:
                opt_status = "failed"
                self.warnings.append("Minimum variance optimization did not converge. Fallback to equal weight.")
                weights = init_guess
        elif self.optimizer == "max_sharpe":
            weights, status = solve_max_sharpe(
                expected_returns=expected_returns,
                cov_matrix=cov_matrix,
                risk_free_rate=self.risk_free_rate,
                min_weight=self.min_weight,
                max_weight=self.max_weight
            )
            if status == "failed":
                opt_status = "failed"
                self.warnings.append("Maximum Sharpe optimization did not converge. Fallback to equal weight.")
        elif self.optimizer == "mean_variance":
            # Maximize: Return - 2.5 * Variance
            def objective(w):
                port_ret = np.sum(expected_returns * w)
                port_var = np.dot(w.T, np.dot(cov_matrix, w))
                return -(port_ret - 2.5 * port_var)
            res = minimize(objective, init_guess, method='SLSQP', bounds=bounds, constraints=eq_cons)
            if res.success:
                weights = res.x
            else:
                opt_status = "failed"
                self.warnings.append("Mean-variance utility optimization did not converge. Fallback to equal weight.")
                weights = init_guess
        elif self.optimizer == "risk_parity":
            def objective(w):
                port_var = np.dot(w.T, np.dot(cov_matrix, w))
                if port_var <= 0:
                    return 1.0
                mrc = np.dot(cov_matrix, w) / np.sqrt(port_var)
                rc = w * mrc
                target = np.sum(rc) / n_assets
                return np.sum((rc - target) ** 2)
            res = minimize(objective, init_guess, method='SLSQP', bounds=bounds, constraints=eq_cons)
            if res.success:
                weights = res.x
            else:
                opt_status = "failed"
                self.warnings.append("Risk Parity optimization did not converge. Fallback to equal weight.")
                weights = init_guess
        else:
            raise ValueError(f"Unsupported optimizer: {self.optimizer}")

        # Post-process weights (ensure strict normalization and bounds)
        weights = np.clip(weights, self.min_weight, self.max_weight)
        total_w = np.sum(weights)
        if total_w > 0:
            weights = weights / total_w
        else:
            weights = init_guess

        weights_dict = {returns_df.columns[i]: float(weights[i]) for i in range(n_assets)}

        # Portfolio metrics
        port_ret, port_vol, sharpe, max_dd, div_ratio = get_portfolio_metrics(weights)

        # Generate Efficient Frontier
        efficient_frontier = self.generate_efficient_frontier(expected_returns, cov_matrix, bounds, eq_cons, get_portfolio_metrics)

        # Calculate risk contributions
        risk_contributions = {}
        port_var = np.dot(weights.T, np.dot(cov_matrix, weights))
        if port_var > 0:
            mrc = np.dot(cov_matrix, weights) / np.sqrt(port_var)
            rc = weights * mrc
            for i in range(n_assets):
                risk_contributions[returns_df.columns[i]] = float(rc[i])
        else:
            risk_contributions = {returns_df.columns[i]: 0.0 for i in range(n_assets)}

        return {
            "success": True,
            "optimizer": self.optimizer,
            "weights": weights_dict,
            "metrics": {
                "expected_return": float(port_ret),
                "volatility": float(port_vol),
                "sharpe_ratio": float(sharpe),
                "max_drawdown_estimate": float(max_dd),
                "diversification_ratio": float(div_ratio),
                "total_portfolio_risk": float(np.sqrt(port_var))
            },
            "risk_contribution": risk_contributions,
            "covariance_method": self.covariance_method,
            "efficient_frontier": efficient_frontier,
            "warnings": self.warnings
        }

    def generate_efficient_frontier(self, expected_returns, cov_matrix, bounds, eq_cons, metrics_fn) -> List[Dict[str, Any]]:
        points = []
        n_assets = len(expected_returns)
        
        # Determine range
        def min_var_obj(w):
            return np.dot(w.T, np.dot(cov_matrix, w))
        
        res_min = minimize(min_var_obj, np.ones(n_assets)/n_assets, method='SLSQP', bounds=bounds, constraints=eq_cons)
        
        def max_ret_obj(w):
            return -np.sum(expected_returns * w)
        
        res_max = minimize(max_ret_obj, np.ones(n_assets)/n_assets, method='SLSQP', bounds=bounds, constraints=eq_cons)

        r_min = np.sum(expected_returns * res_min.x) if res_min.success else float(np.min(expected_returns))
        r_max = np.sum(expected_returns * res_max.x) if res_max.success else float(np.max(expected_returns))

        if r_max <= r_min:
            r_max = r_min + 0.10

        target_returns = np.linspace(r_min, r_max, 30)

        for r_target in target_returns:
            ret_con = {'type': 'ineq', 'fun': lambda w, rt=r_target: np.sum(expected_returns * w) - rt}
            cons = [eq_cons, ret_con]
            
            res = minimize(min_var_obj, res_min.x if res_min.success else np.ones(n_assets)/n_assets, method='SLSQP', bounds=bounds, constraints=cons)
            if res.success:
                w = res.x
                port_ret, port_vol, sharpe, max_dd, div_ratio = metrics_fn(w)
                points.append({
                    "target_return": float(port_ret),
                    "volatility": float(port_vol),
                    "sharpe_ratio": float(sharpe),
                    "weights": {expected_returns.index[i]: float(w[i]) for i in range(n_assets)}
                })
        return points
