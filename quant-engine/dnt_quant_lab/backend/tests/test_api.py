import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app

client = TestClient(app)

@patch('main.prepare_portfolio_data')
@patch('main.run_monte_carlo')
@patch('main.calculate_stress_test')
def test_run_simulation_api(mock_stress, mock_mc, mock_data):
    # Mock data return
    mock_data.return_value = (None, None)
    
    # Mock MC return
    mock_mc.return_value = {
        'max_sharpe': {'weights': {'TCB': 0.5, 'VNM': 0.5}, 'expected_return': 0.1, 'volatility': 0.05, 'sharpe': 1.5} ,
        'frontier_points_x': [0, 1],
        'frontier_points_y': [0, 1],
        'frontier_points_c': [0, 1]
    }
    
    # Mock Stress return
    mock_stress.return_value = {'portfolio_beta': 1.2}
    
    response = client.post("/api/run-simulation", json={
        "capital": 1000000,
        "target_return": 0.1,
        "tickers": ["TCB", "VNM"]
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "chart" in data
    assert "monte_carlo" in data
    assert "stress_test" in data

@patch('main.fetch_current_prices')
@patch('main.prepare_portfolio_data')
@patch('main.evaluate_custom_portfolio')
@patch('main.calculate_stress_test')
def test_evaluate_portfolio_api(mock_stress, mock_eval, mock_data, mock_prices):
    mock_prices.return_value = {"AAA": 10000}
    mock_data.return_value = (None, None)
    mock_eval.return_value = {"expected_return": 0.05}
    mock_stress.return_value = {"portfolio_beta": 1.1}

    response = client.post("/api/evaluate-portfolio", json={
        "holdings": {"AAA": 100},
        "days": 63
    })

    assert response.status_code == 200
    data = response.json()
    assert "chart" in data
    assert "monte_carlo" in data
    assert "stress_test" in data

@patch('main.stream_ai_advice')
def test_ai_advice_api(mock_stream):
    # Mock generator
    def mock_gen(data):
        yield "Hello "
        yield "World"
    
    mock_stream.side_effect = mock_gen
    
    response = client.post("/api/ai-advice", json={
        "monte_carlo": {},
        "stress_test": {}
    })
    
    assert response.status_code == 200
    assert response.text == "Hello World"
