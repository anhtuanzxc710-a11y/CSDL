import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_ai():
    print(f"\n--- Testing AI Advice ---")
    payload = {
        "monte_carlo": {},
        "stress_test": {},
        "lang": "vi"
    }
    try:
        res = requests.post(f"{BASE_URL}/api/ai-advice", json=payload, timeout=20, stream=True)
        print(f"Status: {res.status_code}")
        
        output = ""
        for chunk in res.iter_lines():
            if chunk:
                output += chunk.decode('utf-8') + "\n"
        print(f"Output preview: {output[:300]}...")
    except Exception as e:
        print(f"FAIL (Exception): {e}")

if __name__ == "__main__":
    test_ai()
