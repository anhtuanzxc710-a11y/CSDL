import numpy as np
import pandas as pd

# --- Quantitative Constants (Vietnam Market Context 2026) ---
TRADING_DAYS = 252 
# Risk-free rate based on 10-year Vietnam Government Bond yields (~3%)
RISK_FREE_RATE = 0.03 

def compute_returns(prices: pd.Series) -> pd.Series:
    """Calculate Daily Percentage Returns."""
    return prices.pct_change().dropna()

def compute_cumulative_returns(returns: pd.Series) -> pd.Series:
    """Calculate the growth of an initial investment."""
    return (1 + returns).cumprod() - 1

def compute_beta(stock_returns: pd.Series, market_returns: pd.Series) -> float:
    """Calculate Beta: Measures systematic risk relative to VNINDEX."""
    cov_matrix = np.cov(stock_returns, market_returns)
    covariance = cov_matrix[0, 1]
    market_variance = cov_matrix[1, 1]
    return covariance / market_variance if market_variance != 0 else 0.0

def compute_volatility(returns: pd.Series) -> float:
    """Calculate Annualized Volatility (Standard Deviation of returns)."""
    return returns.std() * np.sqrt(TRADING_DAYS)

def compute_sharpe_ratio(returns: pd.Series) -> float:
    """Calculate the Sharpe Ratio (Risk-Adjusted Return)."""
    # SỬA LỖI: Dùng phép nhân thay vì phép mũ cho Arithmetic Mean
    ann_return = returns.mean() * TRADING_DAYS 
    ann_vol = compute_volatility(returns)
    
    return (ann_return - RISK_FREE_RATE) / ann_vol if ann_vol != 0 else 0.0

def compute_max_drawdown(returns: pd.Series):
    """Calculate the Maximum Drawdown (MDD) and the full Drawdown Series."""
    cum_returns = (1 + returns).cumprod()
    running_max = cum_returns.cummax()
    drawdown = (cum_returns - running_max) / running_max
    max_drawdown = drawdown.min()
    
    return max_drawdown, drawdown

def compute_alpha(stock_returns: pd.Series, market_returns: pd.Series, beta: float) -> float:
    """Calculate Jensen's Alpha using the Capital Asset Pricing Model (CAPM)."""
    # SỬA LỖI: Dùng phép nhân
    ann_stock_ret = stock_returns.mean() * TRADING_DAYS
    ann_market_ret = market_returns.mean() * TRADING_DAYS
    
    expected_return = RISK_FREE_RATE + beta * (ann_market_ret - RISK_FREE_RATE)
    alpha = ann_stock_ret - expected_return
    return alpha

def compute_sortino_ratio(returns: pd.Series) -> float:
    """Calculate the Sortino Ratio."""
    ann_return = returns.mean() * TRADING_DAYS
    
    # SỬA LỖI DOWNSIDE DEVIATION: Đảm bảo chia cho tổng số mẫu (len(returns)), không chỉ số ngày lỗ
    negative_returns = np.minimum(returns, 0) # Các ngày lãi biến thành 0
    downside_variance = np.sum(negative_returns**2) / len(returns)
    downside_deviation = np.sqrt(downside_variance) * np.sqrt(TRADING_DAYS)
    
    return (ann_return - RISK_FREE_RATE) / downside_deviation if downside_deviation != 0 else 0.0

def compute_treynor_ratio(returns: pd.Series, beta: float) -> float:
    """Calculate the Treynor Ratio."""
    ann_return = returns.mean() * TRADING_DAYS
    return (ann_return - RISK_FREE_RATE) / beta if beta != 0 else 0.0

def compute_r_squared(stock_returns: pd.Series, market_returns: pd.Series) -> float:
    """Calculate R-Squared."""
    correlation_matrix = np.corrcoef(stock_returns, market_returns)
    correlation_xy = correlation_matrix[0,1]
    return correlation_xy**2

def compute_var(returns: pd.Series, conf_level: float = 95.0) -> float:
    """Calculate 1-Day Value at Risk (VaR) using Historical Simulation."""
    # Lưu ý: Hàm này tính VaR 1 ngày. Nếu Streamlit hiển thị VaR 1 năm thì cần nhân thêm căn bậc 2 của 252
    return np.percentile(returns, 100 - conf_level)

def compute_calmar_ratio(returns: pd.Series, max_drawdown: float) -> float:
    """Calculate the Calmar Ratio."""
    ann_return = returns.mean() * TRADING_DAYS
    abs_mdd = abs(max_drawdown)
    return ann_return / abs_mdd if abs_mdd != 0 else 0.0