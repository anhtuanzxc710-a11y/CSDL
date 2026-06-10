import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.covariance import LedoitWolf
from typing import Tuple, Optional

def estimate_covariance(returns_df: pd.DataFrame, method: str = "sample") -> pd.DataFrame:
    """
    Ước tính ma trận covariance hàng năm (annualized by * 252).
    """
    if method == "ledoit_wolf":
        cov_matrix_daily = LedoitWolf().fit(returns_df).covariance_
        return pd.DataFrame(cov_matrix_daily, index=returns_df.columns, columns=returns_df.columns) * 252
    else:
        return returns_df.cov() * 252

def adjust_variance_drag(mean_returns: pd.Series, cov_matrix: pd.DataFrame) -> pd.Series:
    """
    Điều chỉnh lực cản biến động (expected return = mean - var / 2).
    """
    variances = np.diag(cov_matrix)
    return mean_returns - (variances / 2)

def solve_max_sharpe(
    expected_returns: pd.Series,
    cov_matrix: pd.DataFrame,
    risk_free_rate: float,
    min_weight: float,
    max_weight: float
) -> Tuple[np.ndarray, str]:
    """
    Sử dụng scipy.optimize.minimize để tìm trọng số tối ưu Max Sharpe dưới ràng buộc tỷ trọng.
    """
    num_assets = len(expected_returns)
    init_guess = np.array(num_assets * [1. / num_assets])
    bounds = tuple((min_weight, max_weight) for _ in range(num_assets))
    constraints = ({'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0})

    def negative_sharpe(w):
        port_ret = np.sum(expected_returns * w)
        port_vol = np.sqrt(np.dot(w.T, np.dot(cov_matrix, w)))
        if port_vol <= 0:
            return 0.0
        return -((port_ret - risk_free_rate) / port_vol)

    res = minimize(negative_sharpe, init_guess, method='SLSQP', bounds=bounds, constraints=constraints)
    if res.success:
        return res.x, "success"
    else:
        return init_guess, "failed"

def calculate_portfolio_metrics(
    weights: np.ndarray,
    expected_returns: pd.Series,
    cov_matrix: pd.DataFrame,
    risk_free_rate: float,
    returns_df: Optional[pd.DataFrame] = None
) -> Tuple[float, float, float, float, float]:
    """
    Tính toán các chỉ số của danh mục: return, volatility, sharpe, max drawdown, diversification ratio.
    """
    w = np.array(weights)
    port_ret = np.sum(expected_returns * w)
    port_var = np.dot(w.T, np.dot(cov_matrix, w))
    port_vol = np.sqrt(port_var)
    sharpe = (port_ret - risk_free_rate) / port_vol if port_vol > 0 else 0.0

    # Max Drawdown
    max_dd = 0.0
    if returns_df is not None:
        daily_port_returns = returns_df.dot(w)
        cum_returns = np.exp(daily_port_returns.cumsum())
        running_max = cum_returns.cummax()
        drawdown = (cum_returns - running_max) / running_max
        max_dd = float(drawdown.min())

    # Diversification Ratio
    asset_vols = np.sqrt(np.diag(cov_matrix))
    weighted_vols = np.sum(w * asset_vols)
    div_ratio = weighted_vols / port_vol if port_vol > 0 else 1.0

    return float(port_ret), float(port_vol), float(sharpe), float(max_dd), float(div_ratio)
