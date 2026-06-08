from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class ChatMessageBase(BaseModel):
    role: str
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    id: int
    thread_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ChatThreadBase(BaseModel):
    title: Optional[str] = "New Conversation"

class ChatThreadCreate(ChatThreadBase):
    pass

class ChatThread(ChatThreadBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ChatThreadWithMessages(ChatThread):
    messages: List[ChatMessage] = []
