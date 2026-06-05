import requests
import time
import sys

BASE_URL = "http://localhost:8000"

def test_full_workflow():
    print("--- 1. Testing Registration ---")
    reg_data = {
        "email": f"test_{int(time.time())}@example.com",
        "password": "password123",
        "full_name": "Test User"
    }
    r = requests.post(f"{BASE_URL}/api/auth/register", json=reg_data)
    print(f"Status: {r.status_code}, Body: {r.json()}")
    if r.status_code != 200: return

    print("\n--- 2. Testing Login ---")
    login_data = {"username": reg_data["email"], "password": reg_data["password"]}
    r = requests.post(f"{BASE_URL}/api/auth/login", data=login_data)
    print(f"Status: {r.status_code}")
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("\n--- 3. Testing Portfolio Creation ---")
    port_data = {"name": "Test Portfolio", "description": "Auto-generated", "type": "saved"}
    r = requests.post(f"{BASE_URL}/api/portfolios/", json=port_data, headers=headers)
    print(f"Status: {r.status_code}, Body: {r.json()}")
    portfolio_id = r.json()["id"]

    print("\n--- 4. Adding Transaction ---")
    tx_data = {
        "ticker": "FPT",
        "side": "BUY",
        "quantity": 100,
        "price": 95000,
        "fee": 1000,
        "trade_date": "2026-04-15"
    }
    r = requests.post(f"{BASE_URL}/api/portfolios/{portfolio_id}/transactions", json=tx_data, headers=headers)
    print(f"Status: {r.status_code}, Body: {r.json()}")

    print("\n--- 5. Verifying Performance snapshots are driven by real data ---")
    r = requests.get(f"{BASE_URL}/api/performance/{portfolio_id}/performance", headers=headers)
    perf = r.json()
    print(f"Performance: Values={perf['values']}, Labels={perf['months']}")
    print(f"Does it have real values? {len(perf['values']) > 0}")

    print("\n--- 6. Testing AI Advice & Chat History ---")
    ai_data = {
        "monte_carlo": {
            "monetary_values": {"initial_capital": 100000000},
            "expected_return": 0.15,
            "volatility": 0.2
        },
        "stress_test": {"portfolio_beta": 1.2, "simulated_market_crash": -0.1},
        "lang": "vi"
    }
    r = requests.post(f"{BASE_URL}/api/ai-advice", json=ai_data, headers=headers, stream=True)
    print("AI Response stream started...")
    full_text = ""
    for chunk in r.iter_content(chunk_size=None):
        full_text += chunk.decode()
    print(f"AI Response complete (prefix): {full_text[:50]}...")
    
    # Check if thread was created
    r = requests.get(f"{BASE_URL}/api/chat/threads", headers=headers)
    threads = r.json()
    print(f"Threads count: {len(threads)}")
    if threads:
        print(f"Latest thread title: {threads[0]['title']}")

    print("\n--- 7. Testing Report Generation ---")
    r = requests.post(f"{BASE_URL}/api/system/reports/generate?format=csv", headers=headers)
    print(f"Status: {r.status_code}, Body: {r.json()}")
    
    # Fetch reports list
    r = requests.get(f"{BASE_URL}/api/system/reports", headers=headers)
    reports = r.json()
    print(f"Reports count: {len(reports)}")

    print("\n--- 8. Verifying Connection Health ---")
    r = requests.get(f"{BASE_URL}/api/system/health")
    print(f"Health: {r.json()}")

if __name__ == "__main__":
    test_full_workflow()
