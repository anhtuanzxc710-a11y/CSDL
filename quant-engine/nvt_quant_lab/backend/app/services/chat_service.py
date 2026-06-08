from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.chat import ChatThread, ChatMessage
from app.schemas.chat import ChatThreadCreate, ChatMessageCreate

def get_threads(db: Session, user_id: int) -> List[ChatThread]:
    return db.query(ChatThread).filter(ChatThread.user_id == user_id).order_by(ChatThread.updated_at.desc()).all()

def create_thread(db: Session, user_id: int, title: str = "New Conversation") -> ChatThread:
    thread = ChatThread(user_id=user_id, title=title)
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread

def get_thread(db: Session, thread_id: int, user_id: int) -> Optional[ChatThread]:
    return db.query(ChatThread).filter(ChatThread.id == thread_id, ChatThread.user_id == user_id).first()

def delete_thread(db: Session, thread_id: int, user_id: int) -> bool:
    thread = get_thread(db, thread_id, user_id)
    if thread:
        db.delete(thread)
        db.commit()
        return True
    return False

def get_messages(db: Session, thread_id: int) -> List[ChatMessage]:
    return db.query(ChatMessage).filter(ChatMessage.thread_id == thread_id).order_by(ChatMessage.created_at.asc()).all()

def add_message(db: Session, thread_id: int, role: str, content: str) -> ChatMessage:
    msg = ChatMessage(thread_id=thread_id, role=role, content=content)
    db.add(msg)
    
    # Touch the thread's updated_at
    thread = db.query(ChatThread).filter(ChatThread.id == thread_id).first()
    if thread:
        # sqlalchemy onupdate handles func.now() implicitly or we can just touch it
        thread.title = thread.title # fake update to trigger onupdate
    
    db.commit()
    db.refresh(msg)
    return msg
