import pandas as pd

from app.services.black_litterman import implied_equilibrium_returns, normalize_market_weights


def test_normalize_market_weights():
    symbols = ["VCB", "ACB", "TCB"]
    weights = {"VCB": 30, "ACB": 30, "TCB": 40}
    normalized = normalize_market_weights(symbols, weights)
    assert round(normalized.sum(), 8) == 1.0


def test_implied_equilibrium_returns_shape():
    cov = pd.DataFrame(
        [
            [0.10, 0.02],
            [0.02, 0.08],
        ],
        index=["VCB", "ACB"],
        columns=["VCB", "ACB"],
    )
    w = pd.Series([0.6, 0.4], index=["VCB", "ACB"])
    pi = implied_equilibrium_returns(cov, w, delta=2.5)
    assert list(pi.index) == ["VCB", "ACB"]
    assert len(pi) == 2