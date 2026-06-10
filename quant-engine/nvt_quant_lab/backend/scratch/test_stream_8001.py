import requests
import json

BASE_URL = "http://127.0.0.1:8001"

def test_stream():
    print("--- 1. Logging in / Registering ---")
    email = "test_stream_ai@example.com"
    password = "password123"
    
    r = requests.post(f"{BASE_URL}/api/auth/login", data={"username": email, "password": password})
    if r.status_code != 200:
        print("Registering new test user...")
        requests.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": password, "full_name": "Test AI Stream"})
        r = requests.post(f"{BASE_URL}/api/auth/login", data={"username": email, "password": password})
    
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} - {r.text}")
        return
        
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n--- 2. Requesting AI Advice Stream ---")
    payload = {
        "prompt": "hello",
        "portfolio_data": {"holdings": [], "has_portfolio": False},
        "lang": "vi"
    }
    
    try:
        res = requests.post(f"{BASE_URL}/api/ai-advice", json=payload, headers=headers, stream=True)
        print(f"HTTP Status Code: {res.status_code}")
        print("Response headers:")
        for k, v in res.headers.items():
            print(f"  {k}: {v}")
            
        print("\nStreaming content:")
        for chunk in res.iter_content(chunk_size=None):
            if chunk:
                text = chunk.decode('utf-8', errors='replace')
                # Replace unicode characters for safe console print
                safe_text = text.encode('ascii', errors='replace').decode('ascii')
                print(safe_text, end='', flush=True)
        print("\n\n--- Finished successfully ---")
    except Exception as e:
        print(f"\nFAIL: Exception occurred: {e}")

if __name__ == "__main__":
    test_stream()
