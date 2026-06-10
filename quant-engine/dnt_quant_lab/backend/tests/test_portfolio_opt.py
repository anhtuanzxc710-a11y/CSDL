import pytest
import pandas as pd
import numpy as np
from core.portfolio_opt import run_monte_carlo, calculate_stress_test, evaluate_custom_portfolio

@pytest.fixture
def sample_returns():
    """Tạo dữ liệu lợi nhuận giả lập cho 3 mã cổ phiếu trong 100 ngày."""
    np.random.seed(42)
    data = {
        'AAA': np.random.normal(0.001, 0.02, 100),
        'BBB': np.random.normal(0.0015, 0.025, 100),
        'CCC': np.random.normal(0.0005, 0.015, 100)
    }
    return pd.DataFrame(data)

@pytest.fixture
def sample_market_returns():
    """Tạo dữ liệu VN-Index giả lập."""
    np.random.seed(0)
    return pd.Series(np.random.normal(0.0008, 0.01, 100), name='VNINDEX')

def test_run_monte_carlo(sample_returns):
    capital = 1000000
    results = run_monte_carlo(sample_returns, num_portfolios=100, initial_capital=capital)
    
    assert 'max_sharpe' in results
    assert 'monetary_values' in results
    assert len(results['frontier_points_x']) == 100
    
    ms = results['max_sharpe']
    assert 'expected_return' in ms
    assert 'volatility' in ms
    assert 'sharpe' in ms
    assert len(ms['weights']) == 3
    assert abs(sum(ms['weights'].values()) - 1.0) < 1e-6
    
    vals = results['monetary_values']
    assert vals['initial_capital'] == capital
    assert vals['expected_value'] > 0

def test_calculate_stress_test(sample_returns, sample_market_returns):
    weights = {'AAA': 0.4, 'BBB': 0.3, 'CCC': 0.3}
    capital = 1000000
    crash = -0.10
    
    results = calculate_stress_test(sample_returns, sample_market_returns, weights, capital, crash)
    
    assert 'portfolio_beta' in results
    assert results['simulated_market_crash'] == crash
    assert 'estimated_portfolio_drop' in results
    assert 'estimated_loss_vnd' in results
    assert results['capital_after_crash'] == capital + results['estimated_loss_vnd']

def test_evaluate_custom_portfolio(sample_returns):
    weights = {'AAA': 0.5, 'BBB': 0.5}
    capital = 500000
    days = 20
    
    # Chúng ta lọc sample_returns chỉ lấy 2 mã AAA, BBB như trong weights
    results = evaluate_custom_portfolio(sample_returns, weights, capital, days)
    
    assert results['timeframe_days'] == days
    assert 'expected_return' in results
    assert 'ci_95_lower' in results
    assert results['monetary_values']['initial_capital'] == capital
