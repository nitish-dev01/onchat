from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from typing import List, Optional
from chat_service.models.database import get_db
from chat_service.models.models import User, Message, Reaction, UserChannel
from chat_service.schemas.schemas import (
    MessageCreate, MessageUpdate, MessageResponse, ReactionCreate, ReactionResponse,
    SearchRequest, SearchResponse, PaginatedResponse
)
from chat_service.core.auth import get_current_user

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.post("/", response_model=MessageResponse, status_code=201)
async def send_message(
    message_data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user is member of channel
    member_result = await db.execute(
        select(UserChannel).where(
            and_(
                UserChannel.user_id == current_user.id,
                UserChannel.channel_id == message_data.channel_id
            )
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this channel")

    message = Message(
        sender_id=current_user.id,
        channel_id=message_data.channel_id,
        content=message_data.content,
        message_type=message_data.message_type,
        reply_to_id=message_data.reply_to_id
    )
    db.add(message)
    await db.flush()
    await db.commit()

    # Get sender info
    await db.refresh(message)

    # Get reply content if exists
    reply_content = None
    if message.reply_to_id:
        reply_result = await db.execute(
            select(Message).where(Message.id == message.reply_to_id)
        )
        reply_msg = reply_result.scalar_one_or_none()
        if reply_msg:
            reply_content = reply_msg.content[:100]

    return MessageResponse(
        id=message.id,
        sender_id=message.sender_id,
        sender_username=current_user.username,
        sender_avatar=current_user.avatar_url,
        channel_id=message.channel_id,
        content=message.content,
        message_type=message.message_type,
        media_url=message.media_url,
        reply_to_id=message.reply_to_id,
        reply_to_content=reply_content,
        is_edited=False,
        created_at=message.created_at,
        updated_at=message.updated_at,
        reactions=[],
        read_count=1
    )


@router.get("/channel/{channel_id}", response_model=List[MessageResponse])
async def get_channel_messages(
    channel_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check membership
    member_result = await db.execute(
        select(UserChannel).where(
            and_(
                UserChannel.user_id == current_user.id,
                UserChannel.channel_id == channel_id
            )
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this channel")

    offset = (page - 1) * page_size

    query = select(Message).where(
        Message.channel_id == channel_id,
        Message.is_deleted == False
    ).order_by(desc(Message.created_at)).offset(offset).limit(page_size)

    result = await db.execute(query)
    messages = result.scalars().all()

    message_responses = []
    for msg in messages:
        # Get sender
        sender_result = await db.execute(select(User).where(User.id == msg.sender_id))
        sender = sender_result.scalar_one_or_none()

        # Get reactions
        reactions_query = select(Reaction.emoji, func.count(Reaction.id).label("count")).where(
            Reaction.message_id == msg.id
        ).group_by(Reaction.emoji)

        reactions_result = await db.execute(reactions_query)
        reactions_data = reactions_result.all()

        reactions = []
        for emoji, count in reactions_data:
            users_query = select(User).join(Reaction).where(
                and_(Reaction.message_id == msg.id, Reaction.emoji == emoji)
            ).limit(5)
            users_result = await db.execute(users_query)
            users = users_result.scalars().all()

            reactions.append(ReactionResponse(
                emoji=emoji,
                count=count,
                users=[UserResponse(
                    id=u.id, username=u.username, email=u.email,
                    full_name=u.full_name, is_online=u.is_online,
                    last_seen=u.last_seen, avatar_url=u.avatar_url,
                    is_active=u.is_active
                ) for u in users]
            ))

        # Get reply content
        reply_content = None
        if msg.reply_to_id:
            reply_result = await db.execute(select(Message).where(Message.id == msg.reply_to_id))
            reply_msg = reply_result.scalar_one_or_none()
            if reply_msg:
                reply_content = reply_msg.content[:100]

        message_responses.append(MessageResponse(
            id=msg.id,
            sender_id=msg.sender_id,
            sender_username=sender.username if sender else "Unknown",
            sender_avatar=sender.avatar_url if sender else None,
            channel_id=msg.channel_id,
            content=msg.content,
            message_type=msg.message_type,
            media_url=msg.media_url,
            reply_to_id=msg.reply_to_id,
            reply_to_content=reply_content,
            is_edited=msg.is_edited,
            created_at=msg.created_at,
            updated_at=msg.updated_at,
            reactions=reactions,
            read_count=1
        ))

    return message_responses


@router.put("/{message_id}", response_model=MessageResponse)
async def edit_message(
    message_id: int,
    message_update: MessageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Message).where(Message.id == message_id))
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only edit your own messages")

    message.content = message_update.content
    message.is_edited = True
    await db.flush()
    await db.refresh(message)

    return MessageResponse(
        id=message.id,
        sender_id=message.sender_id,
        sender_username=current_user.username,
        sender_avatar=current_user.avatar_url,
        channel_id=message.channel_id,
        content=message.content,
        message_type=message.message_type,
        media_url=message.media_url,
        reply_to_id=message.reply_to_id,
        is_edited=True,
        created_at=message.created_at,
        updated_at=message.updated_at,
        reactions=[],
        read_count=1
    )


@router.delete("/{message_id}")
async def delete_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Message).where(Message.id == message_id))
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")

    message.is_deleted = True
    await db.flush()

    return {"message": "Message deleted"}


@router.post("/{message_id}/reactions", response_model=ReactionResponse)
async def add_reaction(
    message_id: int,
    reaction_data: ReactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Message).where(Message.id == message_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Message not found")

    # Check if already reacted
    existing_result = await db.execute(
        select(Reaction).where(
            and_(
                Reaction.message_id == message_id,
                Reaction.user_id == current_user.id,
                Reaction.emoji == reaction_data.emoji
            )
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already reacted")

    reaction = Reaction(
        message_id=message_id,
        user_id=current_user.id,
        emoji=reaction_data.emoji
    )
    db.add(reaction)
    await db.flush()

    # Get count and users
    users_query = select(User).join(Reaction).where(
        and_(Reaction.message_id == message_id, Reaction.emoji == reaction_data.emoji)
    )
    users_result = await db.execute(users_query)
    users = users_result.scalars().all()

    return ReactionResponse(
        emoji=reaction_data.emoji,
        count=len(users),
        users=[UserResponse(
            id=u.id, username=u.username, email=u.email,
            full_name=u.full_name, is_online=u.is_online,
            last_seen=u.last_seen, avatar_url=u.avatar_url,
            is_active=u.is_active
        ) for u in users]
    )


@router.delete("/{message_id}/reactions/{emoji}")
async def remove_reaction(
    message_id: int,
    emoji: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Reaction).where(
            and_(
                Reaction.message_id == message_id,
                Reaction.user_id == current_user.id,
                Reaction.emoji == emoji
            )
        )
    )
    reaction = result.scalar_one_or_none()

    if not reaction:
        raise HTTPException(status_code=404, detail="Reaction not found")

    await db.delete(reaction)
    await db.flush()

    return {"message": "Reaction removed"}


@router.post("/search", response_model=SearchResponse)
async def search_messages(
    search_data: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Search messages
    query = select(Message).where(
        and_(
            Message.content.ilike(f"%{search_data.query}%"),
            Message.is_deleted == False
        )
    )

    if search_data.channel_id:
        # Verify membership
        member_result = await db.execute(
            select(UserChannel).where(
                and_(
                    UserChannel.user_id == current_user.id,
                    UserChannel.channel_id == search_data.channel_id
                )
            )
        )
        if member_result.scalar_one_or_none():
            query = query.where(Message.channel_id == search_data.channel_id)

    query = query.limit(search_data.limit)
    result = await db.execute(query)
    messages = result.scalars().all()

    # Get users for search
    users_query = select(User).where(
        User.username.ilike(f"%{search_data.query}%")
    ).limit(10)
    users_result = await db.execute(users_query)
    users = users_result.scalars().all()

    message_responses = []
    for msg in messages:
        sender_result = await db.execute(select(User).where(User.id == msg.sender_id))
        sender = sender_result.scalar_one_or_none()

        message_responses.append(MessageResponse(
            id=msg.id,
            sender_id=msg.sender_id,
            sender_username=sender.username if sender else "Unknown",
            sender_avatar=sender.avatar_url if sender else None,
            channel_id=msg.channel_id,
            content=msg.content,
            message_type=msg.message_type,
            media_url=msg.media_url,
            reply_to_id=msg.reply_to_id,
            is_edited=msg.is_edited,
            created_at=msg.created_at,
            updated_at=msg.updated_at,
            reactions=[],
            read_count=1
        ))

    return SearchResponse(
        messages=message_responses,
        users=[UserResponse(
            id=u.id, username=u.username, email=u.email,
            full_name=u.full_name, is_online=u.is_online,
            last_seen=u.last_seen, avatar_url=u.avatar_url,
            is_active=u.is_active
        ) for u in users]
    )