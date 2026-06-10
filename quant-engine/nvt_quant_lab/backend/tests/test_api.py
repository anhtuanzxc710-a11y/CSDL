import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app
from app.core.deps import get_current_active_user, get_db
from app.models.user import User

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_dependency_overrides():
    # Setup mock user and db overrides
    mock_user = User(id=1, is_active=True)
    mock_db = MagicMock()
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db
    yield
    app.dependency_overrides.pop(get_current_active_user, None)
    app.dependency_overrides.pop(get_db, None)

@patch('main.prepare_portfolio_data')
@patch('main.run_monte_carlo')
@patch('main.calculate_stress_test')
def test_run_simulation_api(mock_stress, mock_mc, mock_data):
    import pandas as pd
    # Mock data return with DataFrame and Series
    mock_df = pd.DataFrame(index=pd.date_range('2026-01-01', periods=5))
    mock_df['TCB'] = [0.01] * 5
    mock_df['VNM'] = [0.01] * 5
    mock_mkt = pd.Series([0.005] * 5, index=mock_df.index, name='VNINDEX')
    mock_data.return_value = (mock_df, mock_mkt)
    
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
    import pandas as pd
    mock_prices.return_value = {"AAA": 10000}
    mock_df = pd.DataFrame(index=pd.date_range('2026-01-01', periods=5))
    mock_df['AAA'] = [0.01] * 5
    mock_mkt = pd.Series([0.005] * 5, index=mock_df.index, name='VNINDEX')
    mock_data.return_value = (mock_df, mock_mkt)
    mock_eval.return_value = {"expected_return": 0.05}
    mock_stress.return_value = {"portfolio_beta": 1.1}

    response = client.post("/api/evaluate-portfolio", json={
        "holdings": {"AAA": {"quantity": 100, "cost": 10000}},
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
    def mock_gen(data, lang):
        yield "Hello "
        yield "World"
    
    mock_stream.side_effect = mock_gen
    
    response = client.post("/api/ai-advice", json={
        "monte_carlo": {},
        "stress_test": {}
    })
    
    assert response.status_code == 200
    assert response.text == "Hello World"

@patch('app.api.routers.quant.prepare_portfolio_data_resilient')
@patch('app.api.routers.quant.calculate_advanced_metrics')
def test_quant_analyze_api(mock_metrics, mock_data):
    import pandas as pd
    mock_df = pd.DataFrame(index=pd.date_range('2026-01-01', periods=10))
    mock_df['TCB'] = [0.01] * 10
    mock_df['VNM'] = [0.01] * 10
    mock_mkt = pd.Series([0.005] * 10, index=mock_df.index, name='VNINDEX')
    mock_data.return_value = (mock_df, mock_mkt, "VN30", False)
    
    mock_metrics.return_value = {
        "annualized_return": 0.12,
        "annualized_volatility": 0.08,
        "sortino": 1.2,
        "treynor": 0.1,
        "r_squared": 0.8,
        "max_drawdown": -0.05,
        "calmar": 2.4,
        "var_95_daily": -0.01,
        "beta": 1.1
    }
    
    response = client.post("/api/quant/analyze", json={
        "tickers": ["TCB", "VNM"],
        "start_date": "2026-01-01",
        "end_date": "2026-01-10",
        "capital": 1000000,
        "risk_free_rate": 0.03
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "correlation_matrix" in data
    assert "charts" in data
    assert abs(data["metrics"]["sharpe_ratio"] - 1.125) < 1e-5

def test_quant_analyze_api_empty_tickers():
    response = client.post("/api/quant/analyze", json={
        "tickers": [],
        "start_date": "2026-01-01",
        "end_date": "2026-01-10",
        "capital": 1000000,
        "risk_free_rate": 0.03
    })
    assert response.status_code == 400
    assert "Danh sách mã cổ phiếu không được rỗng" in response.json()["detail"]

def test_quant_analyze_api_invalid_capital():
    response = client.post("/api/quant/analyze", json={
        "tickers": ["TCB"],
        "start_date": "2026-01-01",
        "end_date": "2026-01-10",
        "capital": 0,
        "risk_free_rate": 0.03
    })
    assert response.status_code == 400
    assert "Vốn đầu tư ban đầu phải lớn hơn 0" in response.json()["detail"]

def test_quant_analyze_api_invalid_dates():
    response = client.post("/api/quant/analyze", json={
        "tickers": ["TCB"],
        "start_date": "2026-01-10",
        "end_date": "2026-01-01",
        "capital": 1000000,
        "risk_free_rate": 0.03
    })
    assert response.status_code == 400
    assert "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc" in response.json()["detail"]

@patch('app.api.routers.quant.prepare_portfolio_data_resilient')
def test_quant_analyze_api_no_data(mock_data):
    import pandas as pd
    # Return empty dataframes
    mock_data.return_value = (pd.DataFrame(), pd.Series(dtype=float), "NONE", True)
    
    response = client.post("/api/quant/analyze", json={
        "tickers": ["TCB"],
        "start_date": "2026-01-01",
        "end_date": "2026-01-10",
        "capital": 1000000,
        "risk_free_rate": 0.03
    })
    assert response.status_code == 400
    assert "Không lấy được dữ liệu cho các mã cổ phiếu" in response.json()["detail"]

