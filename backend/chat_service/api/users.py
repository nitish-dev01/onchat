from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from typing import List, Optional
from chat_service.models.database import get_db
from chat_service.models.models import User, Contact
from chat_service.schemas.schemas import UserResponse, ContactResponse, UserPresence
from chat_service.core.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/search", response_model=List[UserResponse])
async def search_users(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(User).where(
        and_(
            User.id != current_user.id,
            or_(
                User.username.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%"),
                User.full_name.ilike(f"%{q}%")
            )
        )
    ).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.get("/", response_model=List[ContactResponse])
async def get_contacts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(User).join(Contact, Contact.contact_id == User.id).where(
        Contact.user_id == current_user.id,
        Contact.is_blocked == False
    )

    result = await db.execute(query)
    contacts = result.scalars().all()

    return [
        ContactResponse(
            id=contact.id,
            user_id=contact.id,
            username=contact.username,
            full_name=contact.full_name,
            avatar_url=contact.avatar_url,
            is_online=contact.is_online,
            last_seen=contact.last_seen,
            is_blocked=False,
            is_muted=False
        )
        for contact in contacts
    ]


@router.post("/contacts/{user_id}")
async def add_contact(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="User not found")

    # Check if contact already exists
    result = await db.execute(
        select(Contact).where(
            and_(
                Contact.user_id == current_user.id,
                Contact.contact_id == user_id
            )
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Contact already exists")

    contact = Contact(user_id=current_user.id, contact_id=user_id)
    db.add(contact)
    await db.flush()
    await db.commit()

    return {"message": "Contact added"}


@router.delete("/contacts/{user_id}")
async def remove_contact(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Contact).where(
            and_(
                Contact.user_id == current_user.id,
                Contact.contact_id == user_id
            )
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    await db.delete(contact)
    await db.flush()
    await db.commit()

    return {"message": "Contact removed"}


@router.post("/block/{user_id}")
async def block_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Contact).where(
            and_(
                Contact.user_id == current_user.id,
                Contact.contact_id == user_id
            )
        )
    )
    contact = result.scalar_one_or_none()

    if contact:
        contact.is_blocked = True
    else:
        contact = Contact(user_id=current_user.id, contact_id=user_id, is_blocked=True)
        db.add(contact)

    await db.flush()
    return {"message": "User blocked"}


@router.post("/unblock/{user_id}")
async def unblock_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Contact).where(
            and_(
                Contact.user_id == current_user.id,
                Contact.contact_id == user_id
            )
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact.is_blocked = False
    await db.flush()

    return {"message": "User unblocked"}


@router.get("/blocked", response_model=List[UserResponse])
async def get_blocked_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(User).join(Contact, Contact.contact_id == User.id).where(
        Contact.user_id == current_user.id,
        Contact.is_blocked == True
    )

    result = await db.execute(query)
    return result.scalars().all()