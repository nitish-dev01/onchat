from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    VOICE = "voice"


class ConversationType(str, Enum):
    DIRECT = "direct"
    GROUP = "group"
    CHANNEL = "channel"


# User Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    id: int
    is_online: bool
    last_seen: Optional[datetime]
    avatar_url: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class UserPresence(BaseModel):
    user_id: int
    is_online: bool
    last_seen: Optional[datetime]


# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Channel/Conversation Schemas
class ChannelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class ChannelCreate(ChannelBase):
    channel_type: ConversationType = ConversationType.GROUP


class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None


class ChannelResponse(ChannelBase):
    id: int
    channel_type: ConversationType
    avatar_url: Optional[str]
    created_by: int
    created_at: datetime
    member_count: Optional[int] = None
    is_member: Optional[bool] = None

    class Config:
        from_attributes = True


class ChannelMemberResponse(BaseModel):
    user_id: int
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    is_online: bool


# Message Schemas
class MessageBase(BaseModel):
    content: str = Field(..., min_length=1)
    message_type: MessageType = MessageType.TEXT


class MessageCreate(BaseModel):
    channel_id: int
    content: str = Field(..., min_length=1)
    message_type: MessageType = MessageType.TEXT
    reply_to_id: Optional[int] = None


class MessageUpdate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    sender_username: str
    sender_avatar: Optional[str]
    channel_id: int
    content: str
    message_type: MessageType
    media_url: Optional[str]
    reply_to_id: Optional[int]
    reply_to_content: Optional[str] = None
    is_edited: bool
    created_at: datetime
    updated_at: Optional[datetime]
    reactions: List["ReactionResponse"] = []
    read_count: Optional[int] = None

    class Config:
        from_attributes = True


# Reaction Schemas
class ReactionCreate(BaseModel):
    emoji: str = Field(..., max_length=10)


class ReactionResponse(BaseModel):
    emoji: str
    count: int
    users: List[UserResponse]

    class Config:
        from_attributes = True


# Contact Schemas
class ContactResponse(BaseModel):
    id: int
    user_id: int
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_online: bool
    last_seen: Optional[datetime]
    is_blocked: bool
    is_muted: bool

    class Config:
        from_attributes = True


# Search Schemas
class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    channel_id: Optional[int] = None
    limit: int = Field(default=50, le=100)


class SearchResponse(BaseModel):
    messages: List[MessageResponse]
    users: List[UserResponse]


# Pagination
class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    page_size: int
    has_next: bool


MessageResponse.model_rebuild()