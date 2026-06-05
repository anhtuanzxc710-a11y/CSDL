import os
import sys
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

# Add app directory to path
sys.path.append(os.getcwd())

load_dotenv()

db_uri = os.getenv("SQLALCHEMY_DATABASE_URI")
print(f"Connecting to: {db_uri}")

try:
    engine = create_engine(db_uri)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables found: {tables}")
    
    if "users" in tables:
        print("SUCCESS: 'users' table exists.")
    else:
        print("WARNING: 'users' table NOT found. Migration might be needed.")
except Exception as e:
    print(f"ERROR: Could not connect to database: {e}")
