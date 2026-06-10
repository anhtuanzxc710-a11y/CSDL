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

class TestPhase4OptimizerAPI:
    """Module I: Phase 4 Advanced Portfolio Optimizer API & Engine tests."""

    @pytest.fixture
    def mock_stock_and_index(self):
        dates = pd.date_range(start="2020-01-01", periods=10, freq="D")
        prices_vcb = [100.0 * (1.01 ** i) for i in range(10)]
        prices_fpt = [50.0 * (1.02 ** i) for i in range(10)]
        prices_vn30 = [1000.0 * (1.005 ** i) for i in range(10)]

        with patch("app.core.optimizer_engine.fetch_stock_data_resilient") as mock_stock, \
             patch("app.core.optimizer_engine.fetch_index_data_resilient") as mock_index:
            
            mock_stock.side_effect = lambda ticker, days_back, request_id=None: (
                create_mock_stock_data(dates, prices_vcb) if ticker == "VCB"
                else create_mock_stock_data(dates, prices_fpt) if ticker == "FPT"
                else pd.DataFrame()
            )
            mock_index.return_value = create_mock_stock_data(dates, prices_vn30)
            yield mock_stock, mock_index

    def test_optimizer_validation_empty_symbols(self):
        payload = {
            "symbols": [],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "optimizer": "max_sharpe"
        }
        response = client.post("/api/quant/optimize", json=payload)
        assert response.status_code == 400
        assert "Danh sách mã cổ phiếu không được rỗng" in response.json()["detail"]

    def test_optimizer_validation_too_many_symbols(self):
        payload = {
            "symbols": [f"S{i}" for i in range(25)],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "optimizer": "max_sharpe"
        }
        response = client.post("/api/quant/optimize", json=payload)
        assert response.status_code == 400
        assert "tối đa 20 mã cổ phiếu" in response.json()["detail"]

    def test_optimizer_validation_invalid_date_range(self):
        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-05-01",
            "end_date": "2020-01-01",
            "optimizer": "max_sharpe"
        }
        response = client.post("/api/quant/optimize", json=payload)
        assert response.status_code == 400
        assert "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc" in response.json()["detail"]

    def test_optimizer_validation_infeasible_constraints(self):
        payload = {
            "symbols": ["VCB", "FPT", "MWG"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "optimizer": "max_sharpe",
            "constraints": {
                "min_weight": 0.4, # 0.4 * 3 = 1.2 > 1.0 (infeasible)
                "max_weight": 0.9
            }
        }
        response = client.post("/api/quant/optimize", json=payload)
        assert response.status_code == 400
        assert "constraints are infeasible" in response.json()["detail"].lower()

    def test_optimizer_validation_invalid_method(self):
        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "optimizer": "invalid_method"
        }
        response = client.post("/api/quant/optimize", json=payload)
        assert response.status_code == 400
        assert "không hợp lệ" in response.json()["detail"]

    def test_optimizer_validation_invalid_covariance(self):
        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "optimizer": "max_sharpe",
            "covariance_method": "invalid_cov"
        }
        response = client.post("/api/quant/optimize", json=payload)
        assert response.status_code == 400
        assert "không hợp lệ" in response.json()["detail"]

    def test_valid_equal_weight_optimization(self, mock_stock_and_index):
        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "optimizer": "equal_weight"
        }
        response = client.post("/api/quant/optimize", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["weights"] == {"VCB": 0.5, "FPT": 0.5}

    def test_valid_min_variance_optimization(self, mock_stock_and_index):
        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "optimizer": "min_variance"
        }
        response = client.post("/api/quant/optimize", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "weights" in data
        assert abs(sum(data["weights"].values()) - 1.0) < 1e-4

    def test_valid_max_sharpe_optimization(self, mock_stock_and_index):
        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "optimizer": "max_sharpe",
            "risk_free_rate": 0.02
        }
        response = client.post("/api/quant/optimize", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "weights" in data
        assert abs(sum(data["weights"].values()) - 1.0) < 1e-4

    def test_valid_risk_parity_optimization(self, mock_stock_and_index):
        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "optimizer": "risk_parity"
        }
        response = client.post("/api/quant/optimize", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "risk_contribution" in data
        assert len(data["risk_contribution"]) == 2

    @patch("app.core.optimizer_engine.fetch_stock_data_resilient")
    @patch("app.core.optimizer_engine.fetch_index_data_resilient")
    def test_ledoit_wolf_covariance_method(self, mock_index, mock_stock):
        dates = pd.date_range(start="2020-01-01", periods=10, freq="D")
        prices_vcb = [100.0 * (1.01 ** i) for i in range(10)]
        prices_fpt = [50.0 * (1.02 ** i) for i in range(10)]
        prices_vn30 = [1000.0 * (1.005 ** i) for i in range(10)]

        mock_stock.side_effect = lambda ticker, days_back, request_id=None: (
            create_mock_stock_data(dates, prices_vcb) if ticker == "VCB"
            else create_mock_stock_data(dates, prices_fpt) if ticker == "FPT"
            else pd.DataFrame()
        )
        mock_index.return_value = create_mock_stock_data(dates, prices_vn30)

        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "optimizer": "min_variance",
            "covariance_method": "ledoit_wolf"
        }
        response = client.post("/api/quant/optimize", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["covariance_method"] == "ledoit_wolf"

    @patch("app.core.optimizer_engine.fetch_stock_data_resilient")
    @patch("app.core.optimizer_engine.fetch_index_data_resilient")
    @patch("app.core.backtest_engine.fetch_stock_data_resilient")
    @patch("app.core.backtest_engine.fetch_index_data_resilient")
    def test_optimize_and_backtest_endpoint(self, mock_bt_index, mock_bt_stock, mock_opt_index, mock_opt_stock):
        dates = pd.date_range(start="2020-01-01", periods=10, freq="D")
        prices_vcb = [100.0 * (1.01 ** i) for i in range(10)]
        prices_fpt = [50.0 * (1.02 ** i) for i in range(10)]
        prices_vn30 = [1000.0 * (1.005 ** i) for i in range(10)]

        mock_opt_stock.side_effect = lambda ticker, days_back, request_id=None: (
            create_mock_stock_data(dates, prices_vcb) if ticker == "VCB"
            else create_mock_stock_data(dates, prices_fpt) if ticker == "FPT"
            else pd.DataFrame()
        )
        mock_opt_index.return_value = create_mock_stock_data(dates, prices_vn30)

        mock_bt_stock.side_effect = lambda ticker, days_back, request_id=None: (
            create_mock_stock_data(dates, prices_vcb) if ticker == "VCB"
            else create_mock_stock_data(dates, prices_fpt) if ticker == "FPT"
            else pd.DataFrame()
        )
        mock_bt_index.return_value = create_mock_stock_data(dates, prices_vn30)

        payload = {
            "symbols": ["VCB", "FPT"],
            "start_date": "2020-01-01",
            "end_date": "2020-01-10",
            "optimizer": "min_variance",
            "rebalance_frequency": "monthly",
            "transaction_cost_bps": 15,
            "slippage_bps": 10,
            "benchmark": "VN30"
        }
        response = client.post("/api/quant/optimize-and-backtest", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "optimizer" in data
        assert "backtest" in data
        assert data["optimizer"]["weights"] == data["backtest"]["strategy"]["weights"]
