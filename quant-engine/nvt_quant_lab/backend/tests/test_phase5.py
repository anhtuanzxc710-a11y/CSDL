import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import io

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

class TestPhase5AIResearchAPI:
    """Module G: Phase 5 AI Research Analyst & Automated Investment Report Generator tests."""

    @patch("app.core.research_generator._get_model")
    def test_valid_research_generation_with_api_mock(self, mock_get_model):
        # Mock Gemini Model
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.text = """
        {
            "executive_summary": "Tóm tắt danh mục đầu tư FPT, VCB.",
            "performance_analysis": "Lợi nhuận năm kỳ vọng đạt 15%.",
            "risk_analysis": "Độ biến động ở mức 10%. Sharpe đạt 1.2.",
            "benchmark_analysis": "Tăng trưởng tương đương VN30.",
            "portfolio_observations": "Chi phí giao dịch thấp.",
            "key_takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3", "Takeaway 4"]
        }
        """
        mock_model.generate_content.return_value = mock_response
        mock_get_model.return_value = mock_model

        payload = {
            "analysis_type": "portfolio_review",
            "quant_results": {"tickers": ["FPT", "VCB"], "metrics": {"expected_return": 0.15}},
            "backtest_results": {"metrics": {"annualized_return": 0.12}},
            "optimizer_results": {"weights": {"FPT": 0.5, "VCB": 0.5}},
            "benchmark": "VN30",
            "language": "vi"
        }

        response = client.post("/api/ai/research", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code} - {response.text}"
        data = response.json()
        assert data["success"] is True
        assert "research" in data
        assert "disclaimer" in data["research"]
        assert "Tóm tắt danh mục đầu tư" in data["research"]["executive_summary"]
        assert len(data["warnings"]) == 0

    @patch("app.core.research_generator._get_model")
    def test_fallback_when_gemini_api_fails(self, mock_get_model):
        # Gemini model raise error
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = Exception("Gemini API connection error")
        mock_get_model.return_value = mock_model

        payload = {
            "analysis_type": "portfolio_review",
            "quant_results": {"tickers": ["FPT", "VCB"], "metrics": {"expected_return": 0.15}},
            "backtest_results": {"metrics": {"annualized_return": 0.12}},
            "optimizer_results": {"weights": {"FPT": 0.5, "VCB": 0.5}},
            "benchmark": "VN30",
            "language": "vi"
        }

        response = client.post("/api/ai/research", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["warnings"]) > 0
        assert "fallback" in data["warnings"][0].lower()
        # Verify fallback content populated numbers
        assert "15.00%" in data["research"]["performance_analysis"]

    def test_missing_data_warnings(self):
        # Gemini model returns None (no key config)
        payload = {
            "analysis_type": "portfolio_review",
            "quant_results": None,
            "backtest_results": None,
            "optimizer_results": None,
            "benchmark": "VN30",
            "language": "vi"
        }

        response = client.post("/api/ai/research", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Should contain warnings about missing data and fallback
        assert any("quant_results" in w for w in data["warnings"])
        assert any("backtest_results" in w for w in data["warnings"])
        assert any("optimizer_results" in w for w in data["warnings"])

    def test_invalid_analysis_type(self):
        payload = {
            "analysis_type": "invalid_type",
            "benchmark": "VN30",
            "language": "vi"
        }
        response = client.post("/api/ai/research", json=payload)
        assert response.status_code == 400
        assert "không hợp lệ" in response.json()["detail"]

    def test_export_docx_report_endpoint(self):
        research_payload = {
            "executive_summary": "Tóm tắt danh mục đầu tư FPT, VCB.",
            "performance_analysis": "Lợi nhuận năm kỳ vọng đạt 15%.",
            "risk_analysis": "Độ biến động ở mức 10%. Sharpe đạt 1.2.",
            "benchmark_analysis": "Tăng trưởng tương đương VN30.",
            "portfolio_observations": "Chi phí giao dịch thấp.",
            "key_takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3", "Takeaway 4"]
        }

        payload = {
            "research": research_payload,
            "language": "vi"
        }

        response = client.post("/api/ai/research/export-docx", json=payload)
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        assert len(response.content) > 1000 # Verify it returns actual docx binary bytes
