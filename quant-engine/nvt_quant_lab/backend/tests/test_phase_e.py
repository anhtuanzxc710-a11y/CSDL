import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
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

class TestPhaseEObservability:
    def test_request_id_generation(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        assert len(response.headers["X-Request-ID"]) > 0

    def test_request_id_propagation(self):
        test_id = "test-propagate-123"
        response = client.get("/api/health", headers={"X-Request-ID": test_id})
        assert response.status_code == 200
        assert response.headers["X-Request-ID"] == test_id

    def test_liveness_check(self):
        response = client.get("/api/health/liveness")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_readiness_check(self):
        response = client.get("/api/health/readiness")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_dependencies_check(self):
        response = client.get("/api/health/dependencies")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "checks" in data
        assert "database" in data["checks"]
        assert "ai_provider" in data["checks"]
        assert "storage" in data["checks"]

    def test_sensitive_masking(self):
        from app.core.logging_config import mask_sensitive_data
        payload = {
            "password": "my_secret_password",
            "token": "token123",
            "refresh_token": "rf_token",
            "api_key": "somekey",
            "other_field": "public_data"
        }
        masked = mask_sensitive_data(payload)
        assert masked["password"] == "[MASKED]"
        assert masked["token"] == "[MASKED]"
        assert masked["refresh_token"] == "[MASKED]"
        assert masked["api_key"] == "[MASKED]"
        assert masked["other_field"] == "public_data"

    def test_alerts_disabled_by_default(self):
        from app.core.config import settings
        # ALERT_ENABLED should be false by default
        assert settings.ALERT_ENABLED is False
