# Operations Guide: Observability, Backup, and Recovery

This guide explains how to monitor, maintain, and recover the **NVT Quant Lab** platform in production.

---

## 1. Structured Logging

The application implements structured JSON logging for all API traffic and background tasks.

### Log File Locations
All logs are written to the `backend/logs/` directory with automatic rotation (max 10MB per file, keeping up to 5 backups):
*   `backend/logs/app.log`: Contains general application workflow events and completed API requests (`INFO` and `DEBUG` levels).
*   `backend/logs/error.log`: Contains error details, exceptions, and warnings (`WARNING` and `ERROR` levels).
*   `backend/logs/audit.log`: Contains security and audit-specific logs for user actions (logins, default portfolios, transactions).

### Structured Log Format (JSON)
Every log line is a single JSON object containing:
```json
{
  "timestamp": "2026-06-10T09:28:21.123456Z",
  "level": "INFO",
  "event": "request_completed",
  "request_id": "a1b2c3d4e5f6",
  "user_id": 1,
  "endpoint": "/api/quant/analyze",
  "method": "POST",
  "duration_ms": 124.5,
  "status_code": 200,
  "message": "HTTP POST /api/quant/analyze completed with status 200"
}
```

---

## 2. Tracing and Request Tracking

The platform uses trace propagation:
*   A `request_id` is assigned to every incoming request. If the client includes an `X-Request-ID` header, it is reused; otherwise, a UUID is generated.
*   The `X-Request-ID` is returned in the response headers.
*   All logs generated during that request context automatically include the corresponding `request_id` for easy end-to-end debugging.

---

## 3. Environment Variables Configuration

The following variables should be configured in `backend/.env`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `SENTRY_DSN` | `""` | Sentry integration data source name. If empty, Sentry remains disabled. |
| `SENTRY_ENVIRONMENT` | `"production"` | Operational environment for Sentry. |
| `SENTRY_TRACES_SAMPLE_RATE` | `"0.1"` | Sampling rate for Sentry performance traces (0.0 to 1.0). |
| `ALERT_ENABLED` | `"false"` | Set to `true` to enable webhook alerts on critical failures. |
| `ALERT_WEBHOOK_URL` | `""` | Webhook URL for Discord, Telegram, or generic webhooks. |

---

## 4. Health and Readiness Endpoints

The following GET routes are available for checking system reliability:

*   `/api/health`: Basic health check. Returns `{"status": "ok"}`.
*   `/api/health/liveness`: Checks if the FastAPI process is running.
*   `/api/health/readiness`: Verifies database connectivity. Returns `503 Service Unavailable` if the DB is offline.
*   `/api/health/dependencies`: Detailed operational report of all subsystems (Database latency, Market data, AI Copilot API status, Cache metrics, and Storage folder writability).

---

## 5. Webhook Alerting

Critical system failures automatically send messages to Discord or Telegram via webhook.
*   **Triggers:** Repeated 500 server errors, database disconnects, Entrade network offline, or AI service credentials invalid.
*   **Rate Limiting:** Alerts are rate-limited to a maximum of 1 alert per 5 minutes per event type to prevent spamming channels during an outage.

---

## 6. Backup & Recovery Strategy

### Automated Backup Process
The backup script performs an online backup of the SQLite database without locking out active database transactions.
*   **Script location:** `backend/scripts/backup_database.py`
*   **Run command:**
    ```bash
    python backend/scripts/backup_database.py
    ```
*   **Retention:** Keeps only the last 7 days of backups under `backend/backups/YYYY-MM-DD/`.
*   **Verification:** The script validates the backup file's schema integrity and queries user data records count before completing.

### Database Recovery (Restore Process)
In the event of database corruption or data loss:
1.  **Stop** the FastAPI backend application server process.
2.  **Move/Rename** the corrupted database file:
    ```bash
    mv backend/app.db backend/app_corrupted.db.bak
    ```
3.  **Locate** the latest valid backup file under `backend/backups/YYYY-MM-DD/app_TIMESTAMP.db`.
4.  **Copy** the backup file back to the root database path:
    ```bash
    cp backend/backups/2026-06-10/app_163000.db backend/app.db
    ```
5.  **Restart** the backend application.

---

## 7. Known Limitations

*   **SQLite Locking:** SQLite works best in single-process deployments. For multi-instance load-balanced production scaling, migrate `SQLALCHEMY_DATABASE_URI` to a PostgreSQL server.
*   **Local Exports Storage:** Generated Excel reports are stored in the local `backend/data/` directory. These will be lost if the container/server instance is destroyed unless mapped to a persistent volume.
