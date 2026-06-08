import numpy as np
import pandas as pd
from scipy.optimize import minimize

from app.schemas.portfolio import ViewInput


def compute_returns(close_matrix: pd.DataFrame) -> pd.DataFrame:
    returns = close_matrix.sort_index().pct_change()
    returns = returns.dropna(how="any")
    if returns.empty:
        raise ValueError("Không đủ dữ liệu để tính returns.")
    return returns


def annualize_covariance(returns: pd.DataFrame, periods_per_year: int = 252) -> pd.DataFrame:
    return returns.cov() * periods_per_year


def normalize_market_weights(symbols: list[str], weights: dict[str, float] | None) -> pd.Series:
    if not weights:
        equal = np.repeat(1.0 / len(symbols), len(symbols))
        return pd.Series(equal, index=symbols, dtype=float)

    series = pd.Series({k.upper().strip(): float(v) for k, v in weights.items()})
    series = series.reindex(symbols)
    total = series.sum()

    if total <= 0:
        raise ValueError("Tổng market_weights phải > 0.")

    return series / total


def implied_equilibrium_returns(
    cov_matrix: pd.DataFrame,
    market_weights: pd.Series,
    delta: float,
) -> pd.Series:
    aligned_weights = market_weights.reindex(cov_matrix.index).astype(float).values
    pi = delta * cov_matrix.values @ aligned_weights
    return pd.Series(pi, index=cov_matrix.index, name="prior_return")


def _default_relative_weights(n_assets: int) -> list[float]:
    if n_assets < 2:
        raise ValueError("Relative view cần ít nhất 2 assets.")
    return [1.0] + [-1.0 / (n_assets - 1)] * (n_assets - 1)


def build_view_matrices(
    symbols: list[str],
    views: list[ViewInput],
    cov_matrix: pd.DataFrame,
    tau: float,
) -> tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    if not views:
        empty_p = pd.DataFrame(index=[], columns=symbols, dtype=float)
        empty_q = pd.Series(dtype=float)
        empty_o = pd.DataFrame(index=[], columns=[], dtype=float)
        return empty_p, empty_q, empty_o

    symbol_to_idx = {s: i for i, s in enumerate(symbols)}
    p_rows = []
    q_values = []
    omega_values = []

    tau_cov = tau * cov_matrix.values

    for view in views:
        p = np.zeros(len(symbols), dtype=float)

        if view.type == "absolute":
            asset = view.assets[0]
            p[symbol_to_idx[asset]] = 1.0
        else:
            weights = view.pick_weights or _default_relative_weights(len(view.assets))
            for asset, weight in zip(view.assets, weights):
                p[symbol_to_idx[asset]] = float(weight)

        q_values.append(float(view.q))
        p_rows.append(p)

        confidence = min(max(float(view.confidence), 1e-6), 0.999999)
        base_variance = float(p @ tau_cov @ p.T)
        omega_i = base_variance * (1.0 - confidence) / confidence
        omega_i = max(omega_i, 1e-8)
        omega_values.append(omega_i)

    p_df = pd.DataFrame(p_rows, columns=symbols, dtype=float)
    q_sr = pd.Series(q_values, dtype=float, name="view_return")
    omega_df = pd.DataFrame(np.diag(omega_values), dtype=float)

    return p_df, q_sr, omega_df


def black_litterman_posterior(
    cov_matrix: pd.DataFrame,
    prior_returns: pd.Series,
    p_matrix: pd.DataFrame,
    q_vector: pd.Series,
    omega: pd.DataFrame,
    tau: float,
) -> tuple[pd.Series, pd.DataFrame]:
    if p_matrix.empty:
        return prior_returns.copy(), cov_matrix.copy()

    sigma = cov_matrix.values
    pi = prior_returns.values.reshape(-1, 1)
    p = p_matrix.values
    q = q_vector.values.reshape(-1, 1)
    omega_arr = omega.values
    tau_sigma = tau * sigma

    inv_tau_sigma = np.linalg.inv(tau_sigma)
    inv_omega = np.linalg.inv(omega_arr)

    middle = np.linalg.inv(inv_tau_sigma + p.T @ inv_omega @ p)
    posterior_mean = middle @ (inv_tau_sigma @ pi + p.T @ inv_omega @ q)
    posterior_cov = sigma + middle

    posterior_returns = pd.Series(
        posterior_mean.flatten(),
        index=cov_matrix.index,
        name="posterior_return"
    )
    posterior_cov_df = pd.DataFrame(
        posterior_cov,
        index=cov_matrix.index,
        columns=cov_matrix.columns
    )
    return posterior_returns, posterior_cov_df


def optimize_long_only_max_sharpe(
    expected_returns: pd.Series,
    cov_matrix: pd.DataFrame,
    risk_free_rate: float,
    weight_min: float = 0.0,
    weight_max: float = 1.0,
) -> tuple[pd.Series, dict[str, float]]:
    mu = expected_returns.values
    sigma = cov_matrix.values
    n = len(mu)

    x0 = np.repeat(1.0 / n, n)
    bounds = [(weight_min, weight_max) for _ in range(n)]
    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}]

    def objective(w: np.ndarray) -> float:
        port_return = float(w @ mu)
        port_vol = float(np.sqrt(w @ sigma @ w))
        if port_vol <= 0:
            return 1e9
        sharpe = (port_return - risk_free_rate) / port_vol
        return -sharpe

    result = minimize(
        objective,
        x0=x0,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
    )

    if not result.success:
        raise ValueError(f"Tối ưu hóa thất bại: {result.message}")

    weights = np.clip(result.x, weight_min, weight_max)
    weights = weights / weights.sum()

    port_return = float(weights @ mu)
    port_vol = float(np.sqrt(weights @ sigma @ weights))
    sharpe = (port_return - risk_free_rate) / port_vol if port_vol > 0 else 0.0

    weight_series = pd.Series(weights, index=expected_returns.index, name="weight")
    stats = {
        "expected_return": float(port_return),
        "volatility": float(port_vol),
        "sharpe_ratio": float(sharpe),
    }
    return weight_series, stats