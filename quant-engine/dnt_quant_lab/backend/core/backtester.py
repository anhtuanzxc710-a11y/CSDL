import backtrader as bt
import pandas as pd
import numpy as np
from core.data_engine import fetch_stock_data, fetch_index_data

class ValueTracker(bt.Analyzer):
    """
    Theo dõi Giá trị Tài Khoản (Portfolio Value) tại mỗi Node thời gian
    giúp chúng ta trích xuất dữ liệu gửi về API thay vì vẽ đồ thị tĩnh (Matplotlib).
    """
    def __init__(self):
        self.val_hist = {}

    def next(self):
        self.val_hist[self.strategy.datetime.date(0)] = self.strategy.broker.getvalue()

    def get_analysis(self):
        return self.val_hist

class MACrossoverStrategy(bt.Strategy):
    """
    Chiến lược Backtrader: Giao cắt trung bình động (MA Crossover).
    SMA20 cắt lên SMA50 -> MUA (Allocate target weight).
    SMA20 cắt xuống SMA50 -> BÁN (Allocate 0%).
    """
    params = (
        ('short_period', 20),
        ('long_period', 50),
        ('weights', {}), # Dict lưu tỷ trọng kỳ vọng của mỗi mã, VD: {'FPT': 0.3}
    )

    def __init__(self):
        self.inds = {}
        self.in_market = set()
        for d in self.datas:
            # Tạo indicator cho từng luồng dữ liệu (Feed)
            self.inds[d] = {
                'sma_short': bt.indicators.SMA(d.close, period=self.params.short_period),
                'sma_long': bt.indicators.SMA(d.close, period=self.params.long_period)
            }

    def next(self):
        for d in self.datas:
            ticker = d._name
            if ticker not in self.params.weights:
                continue
                
            sma_s = self.inds[d]['sma_short']
            sma_l = self.inds[d]['sma_long']
            
            if len(sma_s) < 2 or len(sma_l) < 2:
                continue

            target_w = self.params.weights[ticker]
            in_pos = ticker in self.in_market
            
            # Trừ hao 1% cho Margin/Commission để tránh bị chối lệnh (Order Margin Canceled)
            buffered_target = target_w * 0.99

            # Chỉ phát lệnh mua khi có tín hiệu tăng VÀ chưa giữ vị thế (tránh bào phí trade mỗi ngày)
            if sma_s[0] > sma_l[0] and not in_pos:
                self.order_target_percent(d, target=buffered_target)
                self.in_market.add(ticker)
            
            # Thoát vị thế dứt khoát khi đảo chiều
            elif sma_s[0] < sma_l[0] and in_pos:
                self.order_target_percent(d, target=0.0)
                self.in_market.remove(ticker)

def run_backtrader_strategy(tickers: list, weights: dict, initial_capital: float, days_back: int = 252) -> dict:
    """
    Chạy engine Backtrader thay thế cho backtest chay cũ.
    Trả về Dict gồm:
    - dates: list ngày tháng ("YYYY-MM-DD")
    - portfolio_cum_returns: list % lợi nhuận 누적 của danh mục MVO qua các lệnh trade.
    - market_cum_returns: list % lợi nhuận lũy kế VNINDEX/VN30 làm Benchmark.
    """
    cerebro = bt.Cerebro()
    cerebro.broker.setcash(initial_capital)
    cerebro.broker.setcommission(commission=0.001) # Phí môi giới chuẩn: 0.1%

    valid_tickers = []
    
    # Kéo thêm data để bù cho 50 ngày Warm-up của SMA50, đảm bảo backtest đúng số days_back
    warmup_days = 60
    total_days = days_back + warmup_days

    for ticker in tickers:
        df = fetch_stock_data(ticker, days_back=total_days)
        if df.empty or len(df) < 50:
            continue
            
        valid_tickers.append(ticker)
        data = bt.feeds.PandasData(
            dataname=df,
            name=ticker,
            open='open', high='high', low='low', close='close', volume='volume'
        )
        cerebro.adddata(data)

    if not valid_tickers:
        return {'dates': [], 'portfolio_cum_returns': [], 'market_cum_returns': []}

    w_sum = sum(weights.get(t, 0) for t in valid_tickers)
    norm_weights = {t: weights.get(t, 0) / w_sum for t in valid_tickers} if w_sum > 0 else {}

    cerebro.addstrategy(MACrossoverStrategy, weights=norm_weights)
    cerebro.addanalyzer(ValueTracker, _name='val_tracker')

    results = cerebro.run()
    strat = results[0]
    val_tracker = strat.analyzers.val_tracker.get_analysis()

    if not val_tracker:
        return {'dates': [], 'portfolio_cum_returns': [], 'market_cum_returns': []}

    dates_list = list(val_tracker.keys())
    port_vals = list(val_tracker.values())

    port_df = pd.DataFrame({'date': dates_list, 'port_val': port_vals})
    port_df['date'] = pd.to_datetime(port_df['date'])
    port_df.set_index('date', inplace=True)
    
    # Lấy chính xác `days_back` ngày cuối cùng sau khi đã warm-up
    if len(port_df) > days_back:
        port_df = port_df.tail(days_back)
    
    # Re-normalize initial capital tại thời điểm bắt đầu biểu đồ hiển thị
    chart_start_val = port_df['port_val'].iloc[0] if len(port_df) > 0 else initial_capital
    port_df['port_cum_ret'] = (port_df['port_val'] / chart_start_val) - 1.0

    # Benchmark cũng fetch đúng total_days và slice tương tự
    mkt_df = fetch_index_data('VN30', total_days)
    market_cum_returns = []
    
    if not mkt_df.empty and 'close' in mkt_df.columns:
        mkt_df.index = pd.to_datetime(mkt_df.index)
        # Chỉ ghép các ngày có chung với Portfolio
        aligned_mkt = mkt_df.reindex(port_df.index).ffill()
        
        # Điền các giá trị NaN nếu có
        if aligned_mkt['close'].isna().any():
            aligned_mkt['close'] = aligned_mkt['close'].fillna(method='bfill').fillna(1.0)
            
        chart_start_mkt = aligned_mkt['close'].iloc[0] if len(aligned_mkt) > 0 else 1.0
        aligned_mkt['mkt_cum_ret'] = (aligned_mkt['close'] / chart_start_mkt) - 1.0
        
        market_cum_returns = aligned_mkt['mkt_cum_ret'].tolist()
    else:
        # Fallback nếu Market Error
        market_cum_returns = [0] * len(port_df)

    dates_str = [d.strftime("%Y-%m-%d") for d in port_df.index]

    return {
        'dates': dates_str,
        'portfolio_cum_returns': port_df['port_cum_ret'].tolist(),
        'market_cum_returns': market_cum_returns
    }
