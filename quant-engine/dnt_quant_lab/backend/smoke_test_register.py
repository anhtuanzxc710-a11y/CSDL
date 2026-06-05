import os
import sys
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Add app directory to path
sys.path.append(os.getcwd())

load_dotenv()

from app.db.session import SessionLocal
from app.schemas.auth import UserCreate
from app.services import auth_service

def test_register():
    db = SessionLocal()
    try:
        # Try to register a test user
        user_in = UserCreate(
            email="test_temp_user@example.com",
            password="test_password",
            full_name="Test User"
        )
        print("Attempting to create user...")
        user = auth_service.create_user(db, user_in=user_in)
        print(f"SUCCESS: User created with ID: {user.id}")
        
        # Cleanup
        db.delete(user)
        db.commit()
        print("Cleanup successful.")
        
    except Exception as e:
        print(f"ERROR during registration logic: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_register()
