import socketio
import json
from typing import Dict, Set

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    always_connect=True
)

# Track connected users
connected_users: Dict[int, str] = {}  # user_id -> sid
user_sessions: Dict[str, int] = {}  # sid -> user_id


@sio.event
async def connect(sid, environ, auth):
    print(f"Client connected: {sid}")
    if auth and auth.get('user_id'):
        user_id = auth['user_id']
        connected_users[user_id] = sid
        user_sessions[sid] = user_id
        await sio.emit('user_online', {'user_id': user_id}, skip_sid=sid)
        print(f"User {user_id} connected with sid {sid}")


@sio.event
async def disconnect(sid):
    user_id = user_sessions.get(sid)
    if user_id:
        del connected_users[user_id]
        del user_sessions[sid]
        await sio.emit('user_offline', {'user_id': user_id}, skip_sid=sid)
        print(f"User {user_id} disconnected")


@sio.event
async def join_channel(sid, data):
    channel_id = data.get('channel_id')
    user_id = user_sessions.get(sid)
    if channel_id and user_id:
        await sio.enter_room(sid, f"channel_{channel_id}")
        await sio.emit('user_joined', {
            'user_id': user_id,
            'channel_id': channel_id
        }, room=f"channel_{channel_id}")
        print(f"User {user_id} joined channel {channel_id}")


@sio.event
async def leave_channel(sid, data):
    channel_id = data.get('channel_id')
    user_id = user_sessions.get(sid)
    if channel_id and user_id:
        await sio.leave_room(sid, f"channel_{channel_id}")
        await sio.emit('user_left', {
            'user_id': user_id,
            'channel_id': channel_id
        }, room=f"channel_{channel_id}")


@sio.event
async def send_message(sid, data):
    channel_id = data.get('channel_id')
    message = data.get('message')
    sender_id = user_sessions.get(sid)

    if channel_id and message and sender_id:
        await sio.emit('new_message', {
            'channel_id': channel_id,
            'message': message,
            'sender_id': sender_id
        }, room=f"channel_{channel_id}")


@sio.event
async def typing_start(sid, data):
    user_id = user_sessions.get(sid)
    channel_id = data.get('channel_id')
    if user_id and channel_id:
        await sio.emit('user_typing', {
            'user_id': user_id,
            'channel_id': channel_id,
            'is_typing': True
        }, room=f"channel_{channel_id}", skip_sid=sid)


@sio.event
async def typing_stop(sid, data):
    user_id = user_sessions.get(sid)
    channel_id = data.get('channel_id')
    if user_id and channel_id:
        await sio.emit('user_typing', {
            'user_id': user_id,
            'channel_id': channel_id,
            'is_typing': False
        }, room=f"channel_{channel_id}", skip_sid=sid)


@sio.event
async def read_messages(sid, data):
    user_id = user_sessions.get(sid)
    channel_id = data.get('channel_id')
    message_ids = data.get('message_ids', [])
    if user_id and channel_id:
        await sio.emit('messages_read', {
            'user_id': user_id,
            'channel_id': channel_id,
            'message_ids': message_ids
        }, room=f"channel_{channel_id}", skip_sid=sid)


# Webhook for HTTP to Socket.IO broadcast
async def broadcast_to_channel(channel_id: int, event: str, data: dict):
    await sio.emit(event, data, room=f"channel_{channel_id}")


# Create ASGI app
socketio_app = socketio.ASGIApp(sio)

# Blueprint for FastAPI integration
from flask import Blueprint
socketio_bp = Blueprint('socketio', __name__)