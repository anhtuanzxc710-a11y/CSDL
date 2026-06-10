import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from main import app
from app.core.deps import get_current_active_user, get_db
from app.models.user import User

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_dependency_overrides():
    mock_user = User(id=1, is_active=True)
    mock_db = MagicMock()
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db
    yield
    app.dependency_overrides.pop(get_current_active_user, None)
    app.dependency_overrides.pop(get_db, None)

def create_mock_stock_data(dates, prices):
    return pd.DataFrame({"close": prices}, index=dates)

class TestPhase3BacktestAPI:
    """Module F: Phase 3 Backtest Engine & API router tests."""

    @patch("app.core.backtest_engine.fetch_stock_data_resilient")
    @patch("app.core.backtest_engine.fetch_index_data_resilient")
    def test_valid_backtest_request(self, mock_index, mock_stock):
        dates = pd.date_range(start="2020-01-01", periods=10, freq="D")
        prices_vcb = [100.0 * (1.01 ** i) for i in range(10)]
        prices_fpt = [50.0 * (1.02 ** i) for i in range(10)]
        
        mock_stock.side_effect = lambda ticker, days_back, request_id=None: (
            create_mock_stock_data(dates, prices_vcb) if ticker == "VCB"
            else create_mock_stock_data(dates, prices_fpt) if ticker == "FPT"
            else pd.DataFrame()
        )
        
        prices_vn30 = [1000.0 * (1.005 ** i) for i in range(10)]
        mock_index.return_value = create_mock_stock_data(dates, prices_vn30)

        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "initial_capital": 100000000,
            "weighting_method": "equal_weight",
            "rebalance_frequency": "monthly",
            "transaction_cost_bps": 10,
            "slippage_bps": 5,
            "benchmark": "VN30",
            "risk_free_rate": 0.03
        }
        
        response = client.post("/api/quant/backtest", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.text}"
        data = response.json()
        assert data["success"] is True
        assert "metrics" in data
        assert "series" in data
        assert "trades" in data
        assert "rebalance_events" in data
        assert data["strategy"]["symbols"] == ["VCB", "FPT"]
        assert len(data["rebalance_events"]) > 0
        assert data["costs"]["total_costs"] > 0

    def test_empty_symbols(self):
        payload = {
            "symbols": [],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "initial_capital": 100000000,
            "weighting_method": "equal_weight",
            "rebalance_frequency": "monthly",
            "transaction_cost_bps": 10,
            "slippage_bps": 5
        }
        response = client.post("/api/quant/backtest", json=payload)
        assert response.status_code == 400
        assert "Danh sách mã cổ phiếu không được rỗng" in response.json()["detail"]

    def test_too_many_symbols(self):
        payload = {
            "symbols": [f"S{i}" for i in range(25)],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "initial_capital": 100000000,
            "weighting_method": "equal_weight",
            "rebalance_frequency": "monthly",
            "transaction_cost_bps": 10,
            "slippage_bps": 5
        }
        response = client.post("/api/quant/backtest", json=payload)
        assert response.status_code == 400
        assert "tối đa 20 mã cổ phiếu" in response.json()["detail"]

    def test_invalid_date_range(self):
        payload = {
            "symbols": ["VCB"],
            "start_date": "2020-05-01",
            "end_date": "2020-01-01",
            "initial_capital": 100000000,
            "weighting_method": "equal_weight",
            "rebalance_frequency": "monthly",
            "transaction_cost_bps": 10,
            "slippage_bps": 5
        }
        response = client.post("/api/quant/backtest", json=payload)
        assert response.status_code == 400
        assert "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc" in response.json()["detail"]

    def test_date_range_too_long(self):
        payload = {
            "symbols": ["VCB"],
            "start_date": "2010-01-01",
            "end_date": "2021-01-01",
            "initial_capital": 100000000,
            "weighting_method": "equal_weight",
            "rebalance_frequency": "monthly",
            "transaction_cost_bps": 10,
            "slippage_bps": 5
        }
        response = client.post("/api/quant/backtest", json=payload)
        assert response.status_code == 400
        assert "không được vượt quá 10 năm" in response.json()["detail"]

    def test_negative_transaction_cost(self):
        payload = {
            "symbols": ["VCB"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "initial_capital": 100000000,
            "weighting_method": "equal_weight",
            "rebalance_frequency": "monthly",
            "transaction_cost_bps": -5,
            "slippage_bps": 5
        }
        response = client.post("/api/quant/backtest", json=payload)
        assert response.status_code == 400
        assert "chi phí" in response.json()["detail"].lower()

    def test_invalid_custom_weights(self):
        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "initial_capital": 100000000,
            "weighting_method": "custom_weight",
            "weights": {"VCB": 0.4, "FPT": 0.5}, # sum = 0.9
            "rebalance_frequency": "monthly",
            "transaction_cost_bps": 10,
            "slippage_bps": 5
        }
        response = client.post("/api/quant/backtest", json=payload)
        assert response.status_code == 400
        assert "Tổng tỷ trọng tùy chỉnh phải bằng 1.0" in response.json()["detail"]

    def test_missing_custom_weights(self):
        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "initial_capital": 100000000,
            "weighting_method": "custom_weight",
            "rebalance_frequency": "monthly",
            "transaction_cost_bps": 10,
            "slippage_bps": 5
        }
        response = client.post("/api/quant/backtest", json=payload)
        assert response.status_code == 400
        assert "không được để trống" in response.json()["detail"]

    def test_invalid_rebalance_frequency(self):
        payload = {
            "symbols": ["VCB"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "initial_capital": 100000000,
            "weighting_method": "equal_weight",
            "rebalance_frequency": "daily",
            "transaction_cost_bps": 10,
            "slippage_bps": 5
        }
        response = client.post("/api/quant/backtest", json=payload)
        assert response.status_code == 400
        assert "Tần suất tái cơ cấu" in response.json()["detail"]

    @patch("app.core.backtest_engine.fetch_stock_data_resilient")
    @patch("app.core.backtest_engine.fetch_index_data_resilient")
    def test_benchmark_unavailable(self, mock_index, mock_stock):
        dates = pd.date_range(start="2020-01-01", periods=10, freq="D")
        prices_vcb = [100.0 * (1.01 ** i) for i in range(10)]
        prices_fpt = [50.0 * (1.02 ** i) for i in range(10)]
        
        mock_stock.side_effect = lambda ticker, days_back, request_id=None: (
            create_mock_stock_data(dates, prices_vcb) if ticker == "VCB"
            else create_mock_stock_data(dates, prices_fpt) if ticker == "FPT"
            else pd.DataFrame()
        )
        
        # Benchmark fails completely
        mock_index.return_value = pd.DataFrame()

        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "initial_capital": 100000000,
            "weighting_method": "equal_weight",
            "rebalance_frequency": "monthly",
            "transaction_cost_bps": 10,
            "slippage_bps": 5,
            "benchmark": "VN30"
        }
        
        response = client.post("/api/quant/backtest", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["warnings"]) > 0
        assert data["metrics"]["beta"] is None
        assert data["metrics"]["alpha"] is None
        assert data["metrics"]["tracking_error"] is None
        assert data["metrics"]["information_ratio"] is None
        assert data["series"]["benchmark_curve"] == [100000000] * 10
