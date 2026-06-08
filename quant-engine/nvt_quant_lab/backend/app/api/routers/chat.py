from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.chat import ChatThread, ChatThreadCreate, ChatMessage as ChatMessageSchema, ChatMessageCreate
from app.services import chat_service

router = APIRouter()

@router.get("/threads", response_model=List[ChatThread])
def get_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return chat_service.get_threads(db, current_user.id)

@router.post("/threads", response_model=ChatThread)
def create_thread(
    thread_in: ChatThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return chat_service.create_thread(db, current_user.id, thread_in.title)

@router.get("/threads/{thread_id}", response_model=ChatThread)
def get_thread(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    thread = chat_service.get_thread(db, thread_id, current_user.id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread

@router.delete("/threads/{thread_id}")
def delete_thread(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    success = chat_service.delete_thread(db, thread_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Thread not found")
    return {"success": True}

@router.get("/threads/{thread_id}/messages", response_model=List[ChatMessageSchema])
def get_messages(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    thread = chat_service.get_thread(db, thread_id, current_user.id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return chat_service.get_messages(db, thread_id)

@router.post("/threads/{thread_id}/messages", response_model=ChatMessageSchema)
def add_message(
    thread_id: int,
    msg_in: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    thread = chat_service.get_thread(db, thread_id, current_user.id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return chat_service.add_message(db, thread_id, msg_in.role, msg_in.content)
