import time
import requests
import threading
from typing import Optional
from app.core.config import settings

# Thread-safe in-memory cache for tracking last alert times per event
_last_alert_times = {}
_lock = threading.Lock()

# Rate limit: 5 minutes (300 seconds)
ALERT_RATE_LIMIT_SEC = 300

def send_alert(event: str, message: str, level: str = "WARNING"):
    """
    Sends an alert notification via Webhook (Discord, Telegram, or generic)
    if ALERT_ENABLED is True and the rate limit allows.
    Runs in a non-blocking background thread.
    """
    if not settings.ALERT_ENABLED or not settings.ALERT_WEBHOOK_URL:
        return
        
    with _lock:
        now = time.time()
        last_time = _last_alert_times.get(event, 0)
        if now - last_time < ALERT_RATE_LIMIT_SEC:
            # Rate limited
            return
        _last_alert_times[event] = now

    # Spawn background thread to prevent blocking fastAPI endpoints
    thread = threading.Thread(target=_dispatch_webhook, args=(event, message, level), daemon=True)
    thread.start()

def _dispatch_webhook(event: str, message: str, level: str):
    url = settings.ALERT_WEBHOOK_URL
    payload = {
        "event": event,
        "level": level,
        "message": message,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # Check if this is a Discord Webhook
    if "discord.com" in url or "discordapp.com" in url:
        color_map = {
            "INFO": 3066993,      # Green
            "WARNING": 15105570,   # Orange
            "ERROR": 15158332,     # Red
            "CRITICAL": 10038562   # Dark Red
        }
        discord_payload = {
            "embeds": [{
                "title": f"🚨 NVT Quant Lab Alert - {event}",
                "color": color_map.get(level.upper(), 15105570),
                "fields": [
                    {"name": "Severity Level", "value": level, "inline": True},
                    {"name": "Timestamp", "value": payload["timestamp"], "inline": True},
                    {"name": "Description", "value": message}
                ]
            }]
        }
        payload = discord_payload
    # Check if this is a Telegram Webhook
    elif "api.telegram.org" in url:
        # Telegram expects text payload or specific structure depending onbot API
        telegram_payload = {
            "text": f"🚨 *NVT Quant Lab Alert - {event}*\n*Severity*: {level}\n*Time*: {payload['timestamp']}\n\n{message}"
        }
        payload = telegram_payload

    try:
        res = requests.post(url, json=payload, timeout=5)
        res.raise_for_status()
    except Exception as e:
        # Avoid calling logger again to prevent infinite loop
        print(f"[ERROR] Failed to send webhook alert: {e}")
