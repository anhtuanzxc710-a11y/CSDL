"""
Module I+J – Regression Protection & Quant Validation Tests
Phase 2: Quant Platform Productionization

NOTE: This is a NEW test file. Existing test_api.py is NOT modified.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np

from main import app
from app.core.deps import get_current_active_user, get_db
from app.models.user import User

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_dependency_overrides():
    """Setup mock user and db overrides for all tests."""
    mock_user = User(id=1, is_active=True)
    mock_db = MagicMock()
    app.dependency_overrides[get_current_active_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db
    yield
    app.dependency_overrides.pop(get_current_active_user, None)
    app.dependency_overrides.pop(get_db, None)


# ═══════════════════════════════════════════════════════════════════════════
# MODULE F: Health Check Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestHealthEndpoints:
    """Module F: Verify health check endpoints."""

    def test_basic_health_check(self):
        """GET /api/health should return 200 with status ok."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_quant_health_check(self):
        """GET /api/health/quant should return subsystem statuses."""
        response = client.get("/api/health/quant")
        assert response.status_code == 200
        data = response.json()
        assert "cache" in data
        assert "market_data" in data
        assert "benchmark" in data
        assert data["cache"]["backend"] == "sqlite"


# ═══════════════════════════════════════════════════════════════════════════
# MODULE D: Standardized Error Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestErrorManagement:
    """Module D: Verify standardized error responses."""

    def test_error_response_schema(self):
        from app.core.errors import QuantErrorCode, build_error_response
        error = build_error_response(QuantErrorCode.DATA_FETCH_ERROR)
        assert error["success"] is False
        assert error["error_code"] == "DATA_FETCH_ERROR"
        assert "message" in error

    def test_success_response_schema(self):
        from app.core.errors import build_success_response
        data = {"tickers": ["FPT"], "metrics": {"return": 0.1}}
        result = build_success_response(data, meta={"request_id": "abc123"})
        assert result["success"] is True
        assert result["tickers"] == ["FPT"]
        assert result["_meta"]["request_id"] == "abc123"

    def test_success_preserves_original_fields(self):
        """Verify backward compatibility: all original fields preserved."""
        from app.core.errors import build_success_response
        original = {"a": 1, "b": [2, 3], "c": {"d": 4}}
        result = build_success_response(original)
        assert result["a"] == 1
        assert result["b"] == [2, 3]
        assert result["c"]["d"] == 4
        assert result["success"] is True


# ═══════════════════════════════════════════════════════════════════════════
# MODULE E: Logging Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestLogging:
    """Module E: Verify structured logging functions don't crash."""

    def test_generate_request_id(self):
        from app.core.logging_config import generate_request_id
        rid = generate_request_id()
        assert isinstance(rid, str)
        assert len(rid) == 12

    def test_timer_context_manager(self):
        from app.core.logging_config import Timer
        import time
        with Timer() as t:
            time.sleep(0.01)
        assert t.elapsed_ms > 0

    def test_log_functions_no_crash(self):
        """Ensure all log functions execute without exceptions."""
        from app.core.logging_config import (
            log_analysis_started, log_analysis_completed,
            log_cache_hit, log_cache_miss, log_retry_triggered,
            log_benchmark_fallback, log_exception
        )
        log_analysis_started("test-id", ["FPT"], "2026-01-01", "2026-12-31")
        log_analysis_completed("test-id", 100.0, 1)
        log_cache_hit("test-id", "FPT")
        log_cache_miss("test-id", "VCB")
        log_retry_triggered("test-id", 1, 2, url="test", error="timeout")
        log_benchmark_fallback("test-id", "VN30", "VNINDEX")
        log_exception("test-id", "TEST_ERROR", "test message")


# ═══════════════════════════════════════════════════════════════════════════
# MODULE A+B+C: Resilience Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestResilience:
    """Module A+B+C: Verify resilience layer."""

    def test_cache_stats_tracking(self):
        from app.core.resilience import CacheStats
        stats = CacheStats()
        stats.record_hit()
        stats.record_hit()
        stats.record_miss()
        s = stats.stats
        assert s["hits"] == 2
        assert s["misses"] == 1
        assert s["hit_rate"] == pytest.approx(0.6667, abs=0.01)

    @patch('core.data_engine.fetch_stock_data')
    def test_resilient_fetch_success(self, mock_fetch):
        """Normal fetch should succeed on first try."""
        from app.core.resilience import fetch_stock_data_resilient
        mock_df = pd.DataFrame({'close': [100, 101]})
        mock_fetch.return_value = mock_df
        result = fetch_stock_data_resilient("FPT", request_id="test")
        assert not result.empty
        mock_fetch.assert_called_once()

    @patch('core.data_engine.fetch_stock_data')
    def test_resilient_fetch_retry_on_failure(self, mock_fetch):
        """Should retry on exception and return empty after max retries."""
        from app.core.resilience import fetch_stock_data_resilient
        mock_fetch.side_effect = Exception("Network error")
        result = fetch_stock_data_resilient("FPT", request_id="test")
        assert result.empty
        assert mock_fetch.call_count == 3  # 1 initial + 2 retries

    @patch('app.core.resilience.fetch_index_data_resilient')
    def test_benchmark_fallback_chain(self, mock_index):
        """Should fall through VN30 → VNINDEX → degraded mode."""
        from app.core.resilience import fetch_benchmark_with_fallback
        mock_index.return_value = pd.DataFrame()  # Both fail
        _, source, is_degraded = fetch_benchmark_with_fallback(request_id="test")
        assert is_degraded is True
        assert source == "NONE"


# ═══════════════════════════════════════════════════════════════════════════
# MODULE I: Regression Tests (Existing Routes)
# ═══════════════════════════════════════════════════════════════════════════

class TestRegressionExistingRoutes:
    """Module I: Verify existing endpoints still respond correctly."""

    def test_auth_login_route_exists(self):
        """Auth route should exist and respond (even if auth fails)."""
        response = client.post("/api/auth/login", json={
            "username": "test",
            "password": "test"
        })
        # Should get 401 (unauthorized) not 404 (route missing)
        assert response.status_code != 404

    def test_quant_route_exists(self):
        """Quant route should still be registered."""
        response = client.post("/api/quant/analyze", json={
            "tickers": [],
            "start_date": "2026-01-01",
            "end_date": "2026-01-10"
        })
        # Should get 400 (validation) not 404 (route missing)
        assert response.status_code == 400

    def test_health_route_new(self):
        """New health route should not conflict with existing routes."""
        response = client.get("/api/health")
        assert response.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# MODULE J: Quant Validation Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestQuantValidation:
    """Module J: Verify analytical correctness with Phase 2 integration."""

    @patch('app.api.routers.quant.prepare_portfolio_data_resilient')
    @patch('app.api.routers.quant.calculate_advanced_metrics')
    def test_quant_analyze_with_resilience(self, mock_metrics, mock_data):
        """Normal analysis should return success=True with _meta."""
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
        # Phase 1 fields still present
        assert "metrics" in data
        assert "correlation_matrix" in data
        assert "charts" in data
        # Phase 2 enhancements
        assert data["success"] is True
        assert "_meta" in data
        assert data["_meta"]["benchmark_source"] == "VN30"
        assert data["_meta"]["is_degraded"] is False
        assert "request_id" in data["_meta"]
        assert "execution_time_ms" in data["_meta"]

    @patch('app.api.routers.quant.prepare_portfolio_data_resilient')
    @patch('app.api.routers.quant.calculate_advanced_metrics')
    def test_quant_analyze_degraded_mode(self, mock_metrics, mock_data):
        """Analysis in degraded mode should still succeed with is_degraded=True."""
        mock_df = pd.DataFrame(index=pd.date_range('2026-01-01', periods=10))
        mock_df['FPT'] = [0.01] * 10
        mock_mkt = pd.Series([0.0] * 10, index=mock_df.index)
        # Return degraded mode
        mock_data.return_value = (mock_df, mock_mkt, "NONE", True)

        mock_metrics.return_value = {
            "annualized_return": 0.10,
            "annualized_volatility": 0.06,
            "sortino": 1.0,
            "treynor": 0.08,
            "r_squared": 0.0,
            "max_drawdown": -0.03,
            "calmar": 3.0,
            "var_95_daily": -0.008,
            "beta": 1.0
        }

        response = client.post("/api/quant/analyze", json={
            "tickers": ["FPT"],
            "start_date": "2026-01-01",
            "end_date": "2026-01-10",
            "capital": 1000000,
            "risk_free_rate": 0.03
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["_meta"]["is_degraded"] is True
        assert data["_meta"]["benchmark_source"] == "NONE"
        # Metrics should still be present
        assert "metrics" in data
        assert data["metrics"]["expected_return"] is not None

    def test_quant_validation_empty_tickers(self):
        """Empty tickers should return 400."""
        response = client.post("/api/quant/analyze", json={
            "tickers": [],
            "start_date": "2026-01-01",
            "end_date": "2026-01-10"
        })
        assert response.status_code == 400

    def test_quant_validation_invalid_dates(self):
        """start_date > end_date should return 400."""
        response = client.post("/api/quant/analyze", json={
            "tickers": ["FPT"],
            "start_date": "2026-01-10",
            "end_date": "2026-01-01"
        })
        assert response.status_code == 400

    def test_quant_validation_invalid_capital(self):
        """Zero capital should return 400."""
        response = client.post("/api/quant/analyze", json={
            "tickers": ["FPT"],
            "start_date": "2026-01-01",
            "end_date": "2026-01-10",
            "capital": 0
        })
        assert response.status_code == 400
