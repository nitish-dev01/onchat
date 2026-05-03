from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from chat_service.models.database import get_db
from chat_service.models.models import User, Channel, UserChannel
from chat_service.schemas.schemas import (
    ChannelCreate, ChannelUpdate, ChannelResponse, ChannelMemberResponse, ConversationType
)
from chat_service.core.auth import get_current_user

router = APIRouter(prefix="/channels", tags=["Channels"])


@router.post("/", response_model=ChannelResponse, status_code=201)
async def create_channel(
    channel_data: ChannelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    channel = Channel(
        name=channel_data.name,
        description=channel_data.description,
        channel_type=channel_data.channel_type,
        created_by=current_user.id
    )
    db.add(channel)
    await db.flush()

    # Add creator as admin
    user_channel = UserChannel(
        user_id=current_user.id,
        channel_id=channel.id,
        role="admin"
    )
    db.add(user_channel)
    await db.flush()
    await db.commit()
    await db.refresh(channel)

    return channel


@router.get("/", response_model=List[ChannelResponse])
async def get_my_channels(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Channel).join(UserChannel).where(
        UserChannel.user_id == current_user.id,
        Channel.is_archived == False
    ).order_by(UserChannel.joined_at.desc())

    result = await db.execute(query)
    channels = result.scalars().all()

    # Add member count and is_member
    channel_responses = []
    for ch in channels:
        count_result = await db.execute(
            select(func.count(UserChannel.id)).where(UserChannel.channel_id == ch.id)
        )
        member_count = count_result.scalar()

        response = ChannelResponse(
            id=ch.id,
            name=ch.name,
            description=ch.description,
            channel_type=ch.channel_type,
            avatar_url=ch.avatar_url,
            created_by=ch.created_by,
            created_at=ch.created_at,
            member_count=member_count,
            is_member=True
        )
        channel_responses.append(response)

    return channel_responses


@router.get("/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = result.scalar_one_or_none()

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # Check membership
    member_result = await db.execute(
        select(UserChannel).where(
            and_(
                UserChannel.user_id == current_user.id,
                UserChannel.channel_id == channel_id
            )
        )
    )
    is_member = member_result.scalar_one_or_none() is not None

    if channel.channel_type != ConversationType.DIRECT and not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this channel")

    # Member count
    count_result = await db.execute(
        select(func.count(UserChannel.id)).where(UserChannel.channel_id == channel_id)
    )
    member_count = count_result.scalar()

    return ChannelResponse(
        id=channel.id,
        name=channel.name,
        description=channel.description,
        channel_type=channel.channel_type,
        avatar_url=channel.avatar_url,
        created_by=channel.created_by,
        created_at=channel.created_at,
        member_count=member_count,
        is_member=is_member
    )


@router.put("/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: int,
    channel_update: ChannelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = result.scalar_one_or_none()

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # Check if user is admin
    member_result = await db.execute(
        select(UserChannel).where(
            and_(
                UserChannel.user_id == current_user.id,
                UserChannel.channel_id == channel_id
            )
        )
    )
    membership = member_result.scalar_one_or_none()

    if not membership or membership.role not in ["admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if channel_update.name is not None:
        channel.name = channel_update.name
    if channel_update.description is not None:
        channel.description = channel_update.description
    if channel_update.avatar_url is not None:
        channel.avatar_url = channel_update.avatar_url

    await db.flush()
    await db.refresh(channel)

    return channel


@router.delete("/{channel_id}")
async def delete_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = result.scalar_one_or_none()

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    if channel.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only creator can delete channel")

    await db.delete(channel)
    await db.flush()

    return {"message": "Channel deleted"}


@router.post("/{channel_id}/members/{user_id}")
async def add_member(
    channel_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if current user is admin
    member_result = await db.execute(
        select(UserChannel).where(
            and_(
                UserChannel.user_id == current_user.id,
                UserChannel.channel_id == channel_id
            )
        )
    )
    membership = member_result.scalar_one_or_none()

    if not membership or membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can add members")

    # Check user exists
    user_result = await db.execute(select(User).where(User.id == user_id))
    if not user_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already member
    existing_result = await db.execute(
        select(UserChannel).where(
            and_(
                UserChannel.user_id == user_id,
                UserChannel.channel_id == channel_id
            )
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already a member")

    user_channel = UserChannel(user_id=user_id, channel_id=channel_id, role="member")
    db.add(user_channel)
    await db.flush()

    return {"message": "Member added"}


@router.delete("/{channel_id}/members/{user_id}")
async def remove_member(
    channel_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if current user is admin
    member_result = await db.execute(
        select(UserChannel).where(
            and_(
                UserChannel.user_id == current_user.id,
                UserChannel.channel_id == channel_id
            )
        )
    )
    membership = member_result.scalar_one_or_none()

    if not membership or membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can remove members")

    result = await db.execute(
        select(UserChannel).where(
            and_(
                UserChannel.user_id == user_id,
                UserChannel.channel_id == channel_id
            )
        )
    )
    user_membership = result.scalar_one_or_none()

    if not user_membership:
        raise HTTPException(status_code=404, detail="User not in channel")

    await db.delete(user_membership)
    await db.flush()

    return {"message": "Member removed"}


@router.get("/{channel_id}/members", response_model=List[ChannelMemberResponse])
async def get_channel_members(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(User, UserChannel.role).join(UserChannel).where(
        UserChannel.channel_id == channel_id
    )

    result = await db.execute(query)
    rows = result.all()

    members = []
    for user, role in rows:
        members.append(ChannelMemberResponse(
            user_id=user.id,
            username=user.username,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            role=role,
            is_online=user.is_online
        ))

    return members


@router.post("/direct/{user_id}", response_model=ChannelResponse, status_code=201)
async def create_direct_channel(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot create DM with yourself")

    # Check if DM already exists
    query = select(Channel).where(
        and_(
            Channel.channel_type == ConversationType.DIRECT,
            Channel.created_by.in_([current_user.id, user_id])
        )
    )
    result = await db.execute(query)
    existing_channels = result.scalars().all()

    for ch in existing_channels:
        members_result = await db.execute(
            select(UserChannel).where(UserChannel.channel_id == ch.id)
        )
        members = members_result.scalars().all()
        member_ids = [m.user_id for m in members]

        if current_user.id in member_ids and user_id in member_ids:
            return ch

    # Create new DM
    channel = Channel(
        name="DM",
        channel_type=ConversationType.DIRECT,
        created_by=current_user.id
    )
    db.add(channel)
    await db.flush()

    # Add both users
    db.add(UserChannel(user_id=current_user.id, channel_id=channel.id, role="member"))
    db.add(UserChannel(user_id=user_id, channel_id=channel.id, role="member"))
    await db.flush()
    await db.refresh(channel)

    return channel