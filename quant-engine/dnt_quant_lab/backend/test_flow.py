import sys
import os
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("Testing auth loop fix...")
    # Test 1: Invalid token to /api/auth/me
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_token"})
    assert res.status_code == 401, f"Expected 401 Unauthorized, got {res.status_code}"
    print("PASS: /api/auth/me returns 401 on invalid token (Fixes auth loop)")

    print("Testing transaction flow...")
    # Test 2: Login
    from app.db.session import SessionLocal
    from app.models.user import User
    from app.core.security import get_password_hash
    db = SessionLocal()
    mock_email = "test_tx_flow@example.com"
    user = db.query(User).filter(User.email == mock_email).first()
    if not user:
        user = User(email=mock_email, username="testflowuser", hashed_password=get_password_hash("password"), full_name="Test Flow User")
        db.add(user)
        db.commit()
    db.close()
    
    res = client.post("/api/auth/login", data={"username": mock_email, "password": "password"})
    assert res.status_code == 200
    tokens = res.json()
    access_token = tokens["access_token"]
    print("PASS: Login successful")

    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Test /api/auth/me with valid token
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200
    print("PASS: /api/auth/me returns 200 on valid token")

    # Test 3: Create portfolio
    res = client.post("/api/portfolios", json={"name": "Test Flow Portfolio", "description": "Fix verification"}, headers=headers)
    assert res.status_code == 200
    portfolio_id = res.json()["id"]
    print(f"PASS: Create portfolio successful (ID: {portfolio_id})")

    # Test 4: Add transaction with new ticker
    res = client.post(f"/api/portfolios/{portfolio_id}/transactions", json={
        "ticker": "NOVA123", # Random to guarantee new
        "side": "BUY",
        "quantity": 100,
        "price": 15000,
        "fee": 0,
        "tax": 0
    }, headers=headers)
    
    if res.status_code != 200:
        print(f"Transaction Error: {res.json()}")
    assert res.status_code == 200
    print("PASS: Add transaction successful (Fixes 500 error)")

    # Test 5: Fetch holdings
    res = client.get(f"/api/portfolios/{portfolio_id}/holdings", headers=headers)
    assert res.status_code == 200
    
    # Assert ticker NOVA exists in holdings
    holdings = res.json()["items"]
    assert "NOVA123" in [h["ticker"] for h in holdings]
    print("PASS: Fetch holdings returns newly added ticker")
    
    print("All tests passed successfully!")

if __name__ == "__main__":
    run_tests()
