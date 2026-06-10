import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_gemini_error():
    print("--- 1. Registering/Logging in ---")
    email = "test_ai_error@example.com"
    password = "password123"
    
    # Try login first in case user already exists
    r = requests.post(f"{BASE_URL}/api/auth/login", data={"username": email, "password": password})
    if r.status_code != 200:
        requests.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": password, "full_name": "Test AI"})
        r = requests.post(f"{BASE_URL}/api/auth/login", data={"username": email, "password": password})
    
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("\n--- 2. Calling AI Advice (Expecting 400 JSON Error) ---")
    payload = {
        "monte_carlo": {"monetary_values": {"initial_capital": 100}},
        "stress_test": {},
        "lang": "vi"
    }
    r = requests.post(f"{BASE_URL}/api/ai-advice", json=payload, headers=headers)
    print(f"Status: {r.status_code}")
    print(f"Body Text: {r.text}")
    try:
        print(f"Body JSON: {r.json()}")
    except:
        print("Failed to parse JSON")

if __name__ == "__main__":
    test_gemini_error()
