from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.auth import Token, User as UserSchema, UserCreate, RefreshTokenRequest
from app.services import auth_service

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = auth_service.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    refresh_token = auth_service.create_refresh_token(db, user.id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

@router.post("/register", response_model=UserSchema)
def register_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
):
    """
    Register a new user.
    """
    user = auth_service.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this user email already exists in the system",
        )
    user = auth_service.create_user(db, user_in=user_in)
    return user

@router.post("/refresh", response_model=Token)
def refresh_token(
    *,
    db: Session = Depends(get_db),
    refresh_in: RefreshTokenRequest
):
    """
    Refresh tokens.
    """
    db_token = auth_service.get_valid_refresh_token(db, refresh_in.refresh_token)
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    
    # Optional: Rotate refresh token here. For now, just generate a new access token
    # and maybe keep the old refresh token, or create a new one. We'll create a new one.
    auth_service.revoke_refresh_token(db, db_token.token)
    
    user_id = db_token.user_id
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user_id, expires_delta=access_token_expires
    )
    new_refresh_token = auth_service.create_refresh_token(db, user_id)
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserSchema)
def read_user_me(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get current user.
    """
    return current_user

@router.post("/logout")
def logout_user(
    *,
    db: Session = Depends(get_db),
    refresh_in: RefreshTokenRequest
):
    """
    Logout by revoking refresh token
    """
    auth_service.revoke_refresh_token(db, refresh_in.refresh_token)
    return {"success": True}

from pydantic import BaseModel

class UserUpdateMe(BaseModel):
    full_name: str | None = None
    email: str | None = None

@router.patch("/me", response_model=UserSchema)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdateMe,
    current_user: User = Depends(get_current_active_user),
):
    """
    Update own user.
    """
    if user_in.email is not None and user_in.email != current_user.email:
        # Check if email is available
        existing_user = auth_service.get_user_by_email(db, email=user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=400, detail="User with this email already exists"
            )
        current_user.email = user_in.email
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
        
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
def change_password(
    *,
    db: Session = Depends(get_db),
    pw_in: ChangePasswordIn,
    current_user: User = Depends(get_current_active_user),
):
    """
    Change user password.
    """
    from app.core.security import verify_password, get_password_hash
    if not verify_password(pw_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    current_user.hashed_password = get_password_hash(pw_in.new_password)
    db.add(current_user)
    db.commit()
    return {"success": True, "message": "Password updated successfully"}
