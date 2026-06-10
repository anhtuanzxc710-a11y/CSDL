import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from fastapi.testclient import TestClient
from main import app
from app.core.deps import get_current_active_user
from app.models.user import User

# Mock current user for authentication check
mock_user = User(id=1, is_active=True, email="test@example.com")
app.dependency_overrides[get_current_active_user] = lambda: mock_user

client = TestClient(app)

def test_real_call():
    print("--- Testing real API call with FPT, VCB, MWG ---")
    payload = {
        "tickers": ["FPT", "VCB", "MWG"],
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "capital": 100000000.0,
        "risk_free_rate": 0.03
    }
    response = client.post("/api/quant/analyze", json=payload)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Expected Return (Ann):", data["metrics"]["expected_return"])
        print("Volatility (Ann):", data["metrics"]["volatility"])
        print("Sharpe Ratio:", data["metrics"]["sharpe_ratio"])
        print("Max Drawdown:", data["metrics"]["max_drawdown"])
        print("Beta:", data["metrics"]["beta"])
        print("Weights:", data["weights"])
        print("Correlation Matrix keys:", list(data["correlation_matrix"].keys()))
        print("Chart dates count:", len(data["charts"]["dates"]))
        print("First 3 chart dates:", data["charts"]["dates"][:3])
        print("First 3 Equity Curve values:", data["charts"]["equity_curve"][:3])
        print("Success!")
    else:
        print("Error detail:", response.json())

    # Error Test 1: Empty Symbols
    print("\n--- Error Test 1: Empty Symbols ---")
    p1 = payload.copy()
    p1["tickers"] = []
    r1 = client.post("/api/quant/analyze", json=p1)
    msg1 = r1.json().get('detail', '')
    if isinstance(msg1, str):
        msg1 = msg1.encode('ascii', 'backslashreplace').decode('ascii')
    print(f"Status: {r1.status_code}, Msg: {msg1}")

    # Error Test 2: Capital <= 0
    print("\n--- Error Test 2: Capital <= 0 ---")
    p2 = payload.copy()
    p2["capital"] = 0
    r2 = client.post("/api/quant/analyze", json=p2)
    msg2 = r2.json().get('detail', '')
    if isinstance(msg2, str):
        msg2 = msg2.encode('ascii', 'backslashreplace').decode('ascii')
    print(f"Status: {r2.status_code}, Msg: {msg2}")

    # Error Test 3: start_date > end_date
    print("\n--- Error Test 3: start_date > end_date ---")
    p3 = payload.copy()
    p3["start_date"] = "2024-12-31"
    p3["end_date"] = "2024-01-01"
    r3 = client.post("/api/quant/analyze", json=p3)
    msg3 = r3.json().get('detail', '')
    if isinstance(msg3, str):
        msg3 = msg3.encode('ascii', 'backslashreplace').decode('ascii')
    print(f"Status: {r3.status_code}, Msg: {msg3}")

    # Error Test 4: Delisted / Fake symbol
    print("\n--- Error Test 4: Fake symbol ---")
    p4 = payload.copy()
    p4["tickers"] = ["FAKE1234"]
    r4 = client.post("/api/quant/analyze", json=p4)
    msg4 = r4.json().get('detail', '')
    if isinstance(msg4, str):
        msg4 = msg4.encode('ascii', 'backslashreplace').decode('ascii')
    print(f"Status: {r4.status_code}, Msg: {msg4}")


if __name__ == "__main__":
    test_real_call()
