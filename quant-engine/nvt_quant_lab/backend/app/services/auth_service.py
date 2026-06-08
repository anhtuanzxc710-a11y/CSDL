import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.system import AuditLog
from app.schemas.auth import UserCreate
from app.services.system_service import add_audit_log


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def authenticate(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email=email)
    if not user:
        return None
    if not security.verify_password(password, user.hashed_password):
        add_audit_log(db, action="LOGIN_FAILED", entity_type="user", details={"email": email})
        return None
    add_audit_log(db, action="LOGIN_SUCCESS", entity_type="user", user_id=user.id)
    return user


def create_user(db: Session, user_in: UserCreate) -> User:
    hashed_password = security.get_password_hash(user_in.password)
    # Ensure username is no longer than 50 characters (matches DB column Username)
    username = user_in.email[:50]
    
    db_obj = User(
        email=user_in.email,
        username=username,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        is_active=True,
    )

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    add_audit_log(db, action="USER_REGISTERED", entity_type="user", user_id=db_obj.id)
    return db_obj


def create_refresh_token(db: Session, user_id: int) -> str:
    token_str = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    db_obj = RefreshToken(
        token_hash=token_str, # In prototype we use UUID as hash directly
        user_id=user_id,
        expires_at=expires_at
    )
    db.add(db_obj)
    db.commit()
    return token_str


def get_valid_refresh_token(db: Session, token: str) -> Optional[RefreshToken]:
    return db.query(RefreshToken).filter(
        RefreshToken.token_hash == token,
        RefreshToken.revoked_at == None,
        RefreshToken.expires_at > datetime.utcnow()
    ).first()


def revoke_refresh_token(db: Session, token: str):
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token).first()
    if db_token:
        db_token.revoked_at = datetime.utcnow()
        db.commit()

