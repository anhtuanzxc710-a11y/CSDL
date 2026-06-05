from app.schemas.portfolio import OptimizeRequest, OptimizeResponse
from app.services.black_litterman import (
    annualize_covariance,
    black_litterman_posterior,
    build_view_matrices,
    compute_returns,
    implied_equilibrium_returns,
    normalize_market_weights,
    optimize_long_only_max_sharpe,
)
from app.services.vnstock_provider import VnStockDataProvider


class PortfolioService:
    def __init__(self, provider: VnStockDataProvider, periods_per_year: int = 252):
        self.provider = provider
        self.periods_per_year = periods_per_year

    def optimize(self, payload: OptimizeRequest) -> OptimizeResponse:
        close_matrix = self.provider.get_close_matrix(
            symbols=payload.symbols,
            start_date=payload.start_date.isoformat(),
            end_date=payload.end_date.isoformat(),
            interval=payload.interval,
        )

        returns = compute_returns(close_matrix)
        cov_matrix = annualize_covariance(returns, periods_per_year=self.periods_per_year)

        if len(returns) < 30:
            raise ValueError("Số quan sát quá ít; nên có ít nhất 30 điểm return.")

        market_weights = normalize_market_weights(payload.symbols, payload.market_weights)
        delta = float(payload.delta or 2.5)

        prior_returns = implied_equilibrium_returns(
            cov_matrix=cov_matrix,
            market_weights=market_weights,
            delta=delta,
        )

        p_matrix, q_vector, omega = build_view_matrices(
            symbols=payload.symbols,
            views=payload.views,
            cov_matrix=cov_matrix,
            tau=payload.tau,
        )

        posterior_returns, posterior_cov = black_litterman_posterior(
            cov_matrix=cov_matrix,
            prior_returns=prior_returns,
            p_matrix=p_matrix,
            q_vector=q_vector,
            omega=omega,
            tau=payload.tau,
        )

        weights, stats = optimize_long_only_max_sharpe(
            expected_returns=posterior_returns,
            cov_matrix=posterior_cov,
            risk_free_rate=payload.risk_free_rate,
            weight_min=payload.weight_min,
            weight_max=payload.weight_max,
        )

        weights = weights.where(weights >= 1e-6, 0.0)
        weights = weights / weights.sum()

        return OptimizeResponse(
            symbols=payload.symbols,
            observations=int(len(returns)),
            prior_returns={k: float(v) for k, v in prior_returns.round(8).to_dict().items()},
            posterior_returns={k: float(v) for k, v in posterior_returns.round(8).to_dict().items()},
            weights={k: float(v) for k, v in weights.round(8).to_dict().items()},
            annual_covariance={
                row: {col: float(val) for col, val in vals.items()}
                for row, vals in posterior_cov.round(10).to_dict(orient="index").items()
            },
            expected_return=float(round(stats["expected_return"], 8)),
            volatility=float(round(stats["volatility"], 8)),
            sharpe_ratio=float(round(stats["sharpe_ratio"], 8)),
        )