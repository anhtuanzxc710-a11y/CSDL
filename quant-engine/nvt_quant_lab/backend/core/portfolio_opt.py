import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.covariance import LedoitWolf
from typing import Optional

def run_monte_carlo(returns_df: pd.DataFrame, num_portfolios: int = 10000, initial_capital: float = 1000000) -> dict:
    """
    Sinh Monte Carlo: Tối ưu hoá Danh mục đầu tư.
    Tính toán Efficient Frontier, điểm Sharpe tối ưu và Khoảng tin cậy (Confidence Interval).
    """
    num_assets = len(returns_df.columns)
    points = np.zeros((num_portfolios, 3)) # Return, Volatility, Sharpe
    weights_record = np.zeros((num_portfolios, num_assets))
    
    mean_returns = returns_df.mean() * 252
    
    # [Tác Vụ 2.2] Covariance Shrinkage với Ledoit-Wolf
    cov_matrix_daily = LedoitWolf().fit(returns_df).covariance_
    cov_matrix = pd.DataFrame(cov_matrix_daily, index=returns_df.columns, columns=returns_df.columns) * 252
    
    # [Tác Vụ 2.1] Điều chỉnh lực cản biến động (Variance Drag)
    # Expected Return = mu - (sigma^2 / 2)
    variances = np.diag(cov_matrix)
    expected_returns = mean_returns - (variances / 2)
    
    # Sinh trọng số ngẫu nhiên
    for i in range(num_portfolios):
        weights = np.random.random(num_assets)
        weights /= np.sum(weights)
        
        port_return = np.sum(expected_returns * weights)
        port_variance = np.dot(weights.T, np.dot(cov_matrix, weights))
        port_volatility = np.sqrt(port_variance)
        
        sharpe = (port_return - 0.03) / port_volatility # Giả định risk-free rate 3%
        
        points[i, :] = [port_return, port_volatility, sharpe]
        weights_record[i, :] = weights
        
    # [Tác Vụ 2.1] Sử dụng scipy.optimize.minimize để tìm Max Sharpe với Ràng buộc (Bounds)
    def negative_sharpe(weights):
        port_return = np.sum(expected_returns * weights)
        port_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
        sharpe_ratio = (port_return - 0.03) / port_volatility
        return -sharpe_ratio

    # Ràng buộc: Tổng tỉ trọng = 1
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    
    # Ràng buộc: Tối thiểu 5%, Tối đa 50% cho mỗi mã cổ phiếu
    bounds = tuple((0.05, 0.50) for _ in range(num_assets))
    
    # Khởi tạo điểm bắt đầu (equal weights)
    init_guess = np.array(num_assets * [1. / num_assets])
    
    optimized_result = minimize(negative_sharpe, init_guess, method='SLSQP', bounds=bounds, constraints=constraints)
    ms_weights = optimized_result.x
    ms_return = np.sum(expected_returns * ms_weights)
    ms_volatil = np.sqrt(np.dot(ms_weights.T, np.dot(cov_matrix, ms_weights)))
    ms_sharpe = (ms_return - 0.03) / ms_volatil
    
    # -- TÍNH KHOẢNG XÁC SUẤT 95% (CONFIDENCE INTERVAL) --
    # Khảo sát Return theo danh mục Max Sharpe với phân phối chuẩn
    # [BẢN SỬA LỖI] Sử dụng Arithmetic Standard Deviation cho CI
    lower_bound_return = ms_return - (1.96 * ms_volatil)
    upper_bound_return = ms_return + (1.96 * ms_volatil)
    
    # 5% sụt giảm tồi tệ nhất (Value at Risk - VaR 95%) 
    # [BẢN SỬA LỖI] VaR nên được tính là mức sụt giảm tệ nhất theo độ lệch chuẩn
    # (Nếu Expected Return dương lớn, VaR có thể vẫn dương, nhưng chúng ta 
    # muốn thể hiện phần rủi ro thực sự mất mát)
    var_95_percent = ms_return - (1.645 * ms_volatil)
    
    # Tính ra số tiền thực tế
    lower_bound_val = initial_capital * (1 + lower_bound_return)
    upper_bound_val = initial_capital * (1 + upper_bound_return)
    expected_val = initial_capital * (1 + ms_return)
    
    # [BẢN SỬA LỖI] VaR: Thể hiện số tiền rủi ro có thể mất (Relative Loss)
    # Chúng ta lấy mức tổn thất so với giá trị kỳ vọng HOẶC vốn gốc. 
    # Ở Việt Nam thường so với Vốn gốc. Nếu tệ nhất vẫn lời thì VaR VND = 0 (Rủi ro mất tiền là 0)
    var_95_worst_value = initial_capital * (1 + var_95_percent)
    var_95_value = min(0, var_95_worst_value - initial_capital)
    
    return {
        'max_sharpe': {
            'expected_return': ms_return,
            'volatility': ms_volatil,
            'sharpe': ms_sharpe,
            'weights': dict(zip(returns_df.columns, ms_weights)),
            'ci_95_lower': lower_bound_return,
            'ci_95_upper': upper_bound_return,
            'var_95_percent': var_95_percent,
        },
        'monetary_values': {
            'initial_capital': initial_capital,
            'expected_value': expected_val,
            'ci_lower_value': lower_bound_val,
            'ci_upper_value': upper_bound_val,
            'var_value_loss': var_95_value
        },
        'frontier_points_x': points[:, 1].tolist(),
        'frontier_points_y': points[:, 0].tolist(),
        'frontier_points_c': points[:, 2].tolist()
    }

def calculate_stress_test(port_returns: pd.DataFrame, market_returns: pd.Series, weights_dict: dict, initial_capital: float, crash_percent: float = -0.05) -> dict:
    """
    Tính năng Stress Test: VN-Index sập mạnh, tài khoản bốc hơi bao nhiêu?
    Sử dụng Beta để ước tính mức độ sụt giảm so với thị trường.
    """
    tickers = list(weights_dict.keys())
    port_ret_selected = port_returns[tickers]
    weights = np.array([weights_dict[t] for t in tickers])
    
    portfolio_beta = 0
    betas = {}
    
    # Tính Beta cho từng cổ phiếu
    if len(market_returns) > 0:
        cov_matrix_with_market = port_ret_selected.apply(lambda x: x.cov(market_returns))
        market_var = market_returns.var()
        if market_var > 0:
            betas = (cov_matrix_with_market / market_var).to_dict()
        else:
            betas = {t: 1.0 for t in tickers}
    else:
        # Giả định Beta = 1 nếu không có dữ liệu Market
        betas = {t: 1.0 for t in tickers}
        
    # Tính Beta tổng của danh mục
    for t in tickers:
        portfolio_beta += betas[t] * weights_dict[t]
        
    # Mô phỏng thiệt hại trong kịch bản sập
    estimated_drop_percent = portfolio_beta * crash_percent
    estimated_loss_value = initial_capital * estimated_drop_percent
    final_capital = initial_capital + estimated_loss_value
    
    return {
        'portfolio_beta': portfolio_beta,
        'simulated_market_crash': crash_percent,
        'estimated_portfolio_drop': estimated_drop_percent,
        'estimated_loss_vnd': estimated_loss_value,
        'capital_after_crash': final_capital
    }

def evaluate_custom_portfolio(returns_df: pd.DataFrame, weights_dict: dict, initial_capital: float, trading_days: int = 63, total_market_value: Optional[float] = None) -> dict:
    """
    Tính năng Đánh Giá Danh Mục Cá Nhân (Evaluator).
    Tính dải mức lợi nhuận và Rủi ro cho một mốc thời gian cố định ở tương lai.
    (Ví dụ 3 tháng = ~63 ngày giao dịch).
    """
    if total_market_value is None:
        total_market_value = initial_capital

    tickers = list(weights_dict.keys())
    port_ret_selected = returns_df[tickers]
    weights = np.array([weights_dict[t] for t in tickers])
    
    # Tính lợi nhuận và Biến động theo NGÀY
    daily_mean_returns = port_ret_selected.mean()
    # Sử dụng LedoitWolf Shrinkage cho Evaluator (Tác vụ 2.2)
    daily_cov_matrix_np = LedoitWolf().fit(port_ret_selected).covariance_
    daily_cov_matrix = pd.DataFrame(daily_cov_matrix_np, index=port_ret_selected.columns, columns=port_ret_selected.columns)
    
    # [Tác Vụ 2.1] Điều chỉnh lực cản biến động (Variance Drag)
    daily_variances = np.diag(daily_cov_matrix)
    daily_expected_returns = daily_mean_returns - (daily_variances / 2)
    
    port_daily_return = np.sum(daily_expected_returns * weights)
    port_daily_variance = np.dot(weights.T, np.dot(daily_cov_matrix, weights))
    
    # Scale mốc thời gian NGÀY lên THỜI HẠN (trading_days)
    period_return = port_daily_return * trading_days
    period_variance = port_daily_variance * trading_days
    period_volatility = np.sqrt(period_variance)
    
    # Tính Khoảng Xác Suất 95% (Distribution Boundaries)
    lower_bound_return = period_return - (1.96 * period_volatility)
    upper_bound_return = period_return + (1.96 * period_volatility)
    var_95_percent = period_return - (1.645 * period_volatility)
    
    # Tính mốc Suy ra Số Tiền VNĐ - Dự phòng dựa trên GIÁ TRỊ THỊ TRƯỜNG HIỆN TẠI (total_market_value)
    expected_val = total_market_value * (1 + period_return)
    lower_bound_val = total_market_value * (1 + lower_bound_return)
    upper_bound_val = total_market_value * (1 + upper_bound_return)
    # [BẢN SỬA LỖI] VaR: Thể hiện số tiền rủi ro có thể mất (Relative Loss) tính từ giá trị thị trường
    var_95_worst_value = total_market_value * (1 + var_95_percent)
    var_95_value = min(0, var_95_worst_value - total_market_value)
    
    # Tính toán Sharpe Ratio thường niên (Giả định risk-free rate 3% tương tự như Monte Carlo)
    ann_return = port_daily_return * 252
    ann_volatility = np.sqrt(port_daily_variance * 252)
    custom_sharpe = (ann_return - 0.03) / ann_volatility if ann_volatility > 0 else 0.0

    return {
        'timeframe_days': trading_days,
        'expected_return': period_return,
        'volatility': period_volatility,
        'ci_95_lower': lower_bound_return,
        'ci_95_upper': upper_bound_return,
        'var_95_percent': var_95_percent,
        'max_sharpe': {
            'sharpe': custom_sharpe,
            'expected_return': ann_return,
            'volatility': ann_volatility,
            'weights': weights_dict
        },
        'monetary_values': {
            'initial_capital': initial_capital, # Đây là giá vốn ban đầu
            'expected_value': expected_val,
            'ci_lower_value': lower_bound_val,
            'ci_upper_value': upper_bound_val,
            'var_value_loss': var_95_value
        }
    }

def calculate_backtest(port_returns: pd.DataFrame, market_returns: pd.Series, weights_dict: dict) -> dict:
    """
    Tính toán Backtest Lịch sử (Khoảng thời gian trong tập dữ liệu).
    Trọng số danh mục được cố định từ đầu kỳ.
    Trả về Dict chứa Chuỗi ngày, Lợi nhuận tích lũy của Danh mục và Thị trường.
    """
    # Lấy các Tickers phù hợp
    tickers = [t for t in weights_dict.keys() if t in port_returns.columns]
    if len(tickers) == 0:
        return {'dates': [], 'portfolio_cum_returns': [], 'market_cum_returns': []}

    weights = np.array([weights_dict[t] for t in tickers])
    
    # Chuẩn hoá trọng số về 100% trong trường hợp thiếu mã
    if np.sum(weights) == 0:
        return {'dates': [], 'portfolio_cum_returns': [], 'market_cum_returns': []}
    weights = weights / np.sum(weights)
    
    # Tính Lợi nhuận hằng ngày của Danh mục
    port_ret_selected = port_returns[tickers]
    daily_port_returns = port_ret_selected.dot(weights)
    
    # Tính Cumulative Returns (Log Returns → exp(cumsum))
    cum_port = np.exp(daily_port_returns.cumsum()) - 1
    cum_market = np.exp(market_returns.cumsum()) - 1
    
    # Đồng bộ index
    cum_market = cum_market.reindex(cum_port.index).ffill().fillna(0)
    
    # Format lại ngày tháng dạng string để JSON Parse dễ
    dates = [d.strftime("%Y-%m-%d") for d in cum_port.index]
    
    return {
        'dates': dates,
        'portfolio_cum_returns': cum_port.fillna(0).tolist(),
        'market_cum_returns': cum_market.tolist()
    }

# --- ADVANCED QUANT METRICS ---
TRADING_DAYS = 252
RISK_FREE_RATE = 0.03

def compute_max_drawdown(cum_returns: pd.Series):
    running_max = cum_returns.cummax()
    drawdown = (cum_returns - running_max) / running_max
    return drawdown.min(), drawdown

def calculate_advanced_metrics(daily_port_returns: pd.Series, market_returns: pd.Series) -> dict:
    """
    Tính Toán Các Chỉ Số Quant Nâng Cao.
    Đầu vào: Series lợi nhuận hàng ngày của MỘT danh mục (đã gộp tỉ trọng).
    """
    if len(daily_port_returns) == 0:
        return {}
        
    # [BẢN SỬA LỖI] Arithmetic Annualization là chuẩn cho MPT
    # Đã chuyển sang Log Returns trong Data Engine nên sum(mean) * 252 là chuẩn
    ann_return = daily_port_returns.mean() * TRADING_DAYS
    ann_vol = daily_port_returns.std() * np.sqrt(TRADING_DAYS)
    
    # 1. Sortino Ratio
    negative_returns = daily_port_returns[daily_port_returns < 0]
    downside_dev = np.sqrt(np.mean(negative_returns**2)) * np.sqrt(TRADING_DAYS)
    sortino = (ann_return - RISK_FREE_RATE) / downside_dev if downside_dev > 0 else 0.0
    
    # 2. Beta & Treynor Ratio
    beta = 1.0
    r_squared = 0.0
    if len(market_returns) > 0 and market_returns.var() > 0:
        cov_matrix = np.cov(daily_port_returns, market_returns)
        beta = cov_matrix[0, 1] / cov_matrix[1, 1]
        
        corr_matrix = np.corrcoef(daily_port_returns, market_returns)
        if not np.isnan(corr_matrix[0, 1]):
            r_squared = corr_matrix[0, 1] ** 2
            
    treynor = (ann_return - RISK_FREE_RATE) / beta if beta != 0 else 0.0
    
    # 3. Maximum Drawdown & Calmar (Log Returns → exp(cumsum))
    cum_returns = np.exp(daily_port_returns.cumsum())
    max_dd, _ = compute_max_drawdown(cum_returns)
    calmar = ann_return / abs(max_dd) if abs(max_dd) > 0 else 0.0
    
    # 4. VaR 95% (Historical Daily)
    var_95_daily = np.percentile(daily_port_returns, 5)
    
    return {
        "annualized_return": ann_return,
        "annualized_volatility": ann_vol,
        "sortino": sortino,
        "treynor": treynor,
        "r_squared": r_squared,
        "max_drawdown": max_dd,
        "calmar": calmar,
        "var_95_daily": var_95_daily,
        "beta": beta
    }

class BlackLittermanOptimizer:
    """
    [Tác Vụ Mô Hình Hóa] Black-Litterman Model Placeholder.
    Mô hình tích hợp kỳ vọng chủ quan (Views) vào Implied Equilibrium Returns.
    """
    def __init__(self, risk_aversion: float = 2.5, tau: float = 0.05):
        self.risk_aversion = risk_aversion
        self.tau = tau
        
    def implied_returns(self, cov_matrix: pd.DataFrame, weights: np.ndarray) -> np.ndarray:
        """Tính Prior: Implied Equilibrium Returns (Market Cap hoặc Equal Weight)"""
        return self.risk_aversion * np.dot(cov_matrix.values, weights)
        
    def optimize(self, cov_matrix: pd.DataFrame, implied_returns: np.ndarray, 
                 P: np.ndarray = None, Q: np.ndarray = None, omega: np.ndarray = None):
        """
        Kết hợp góc nhìn vĩ mô:
        P (Pick matrix): Tham chiếu tài sản trong góc nhìn.
        Q (Views vector): Kỳ vọng lợi nhuận.
        Nếu P và Q = None, hệ thống trả về nguyên Implied Returns.
        """
        if P is None or Q is None:
            return implied_returns
            
        # BL Math Formula placeholder for future version:
        # Returns = (...) * Prior + (...) * Views
        pass
