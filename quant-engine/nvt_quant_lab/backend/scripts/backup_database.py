import os
import shutil
import sqlite3
from datetime import datetime, timedelta

def run_backup():
    """
    Backup SQLite app.db to backups/YYYY-MM-DD/app_TIMESTAMP.db.
    Applies 7-day retention policy and verifies database integrity.
    """
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(backend_dir, "app.db")
    backups_dir = os.path.join(backend_dir, "backups")
    
    if not os.path.exists(db_path):
        print(f"[ERROR] Database file {db_path} does not exist.")
        return False

    # Create timestamped directory
    today_str = datetime.now().strftime("%Y-%m-%d")
    timestamp_str = datetime.now().strftime("%H%M%S")
    dest_dir = os.path.join(backups_dir, today_str)
    os.makedirs(dest_dir, exist_ok=True)
    
    backup_db_path = os.path.join(dest_dir, f"app_{timestamp_str}.db")
    
    print(f"[INFO] Backing up {db_path} to {backup_db_path}...")
    
    try:
        # SQLite Online Backup
        src_conn = sqlite3.connect(db_path)
        dest_conn = sqlite3.connect(backup_db_path)
        with dest_conn:
            src_conn.backup(dest_conn)
        src_conn.close()
        dest_conn.close()
        print("[INFO] Backup file created successfully.")
    except Exception as e:
        print(f"[ERROR] Online backup failed: {e}. Trying file copy...")
        try:
            shutil.copy2(db_path, backup_db_path)
            print("[INFO] File copy backup completed.")
        except Exception as copy_err:
            print(f"[CRITICAL] File copy failed: {copy_err}")
            return False

    # Verify backup database integrity
    try:
        conn = sqlite3.connect(backup_db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        # Verify it has standard tables like Users
        if "Users" not in tables:
            print("[WARNING] Verification warning: 'Users' table not found in backed up database.")
        else:
            print("[INFO] Verification success: 'Users' table found in backup.")
    except Exception as e:
        print(f"[ERROR] Backup database verification failed: {e}")
        return False

    # Apply Retention Policy (keep last 7 days of backups)
    retention_days = 7
    cutoff_date = datetime.now() - timedelta(days=retention_days)
    
    if os.path.exists(backups_dir):
        for entry in os.scandir(backups_dir):
            if entry.is_dir():
                try:
                    # Folder names are in format YYYY-MM-DD
                    folder_date = datetime.strptime(entry.name, "%Y-%m-%d")
                    if folder_date < cutoff_date:
                        print(f"[INFO] Removing old backup directory: {entry.path}")
                        shutil.rmtree(entry.path)
                except ValueError:
                    # Ignore folders that don't match the date pattern
                    pass
                except Exception as clean_err:
                    print(f"[ERROR] Error removing backup folder {entry.path}: {clean_err}")
                    
    print("[INFO] Retention policy check completed.")
    return True

if __name__ == "__main__":
    success = run_backup()
    if success:
        print("[SUCCESS] Database backup finished successfully.")
    else:
        print("[FAILURE] Database backup failed.")
