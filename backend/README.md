# Chat App Backend

## Setup

```bash
cd backend
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/chatdb
export SECRET_KEY=your-super-secret-key
export REDIS_URL=redis://localhost:6379/0

# Run server
uvicorn chat_service.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Auth
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login, returns JWT token
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/me` - Update current user
- `POST /api/v1/auth/presence` - Update online status

### Users
- `GET /api/v1/users/search?q=` - Search users
- `GET /api/v1/users/{id}` - Get user by ID
- `GET /api/v1/users/` - Get contacts
- `POST /api/v1/users/contacts/{id}` - Add contact
- `DELETE /api/v1/users/contacts/{id}` - Remove contact
- `POST /api/v1/users/block/{id}` - Block user
- `POST /api/v1/users/unblock/{id}` - Unblock user
- `GET /api/v1/users/blocked` - Get blocked users

### Channels
- `POST /api/v1/channels/` - Create channel
- `GET /api/v1/channels/` - Get user's channels
- `GET /api/v1/channels/{id}` - Get channel details
- `PUT /api/v1/channels/{id}` - Update channel
- `DELETE /api/v1/channels/{id}` - Delete channel
- `POST /api/v1/channels/{id}/members/{user_id}` - Add member
- `DELETE /api/v1/channels/{id}/members/{user_id}` - Remove member
- `GET /api/v1/channels/{id}/members` - Get members
- `POST /api/v1/channels/direct/{user_id}` - Create/open DM

### Messages
- `POST /api/v1/messages/` - Send message
- `GET /api/v1/messages/channel/{id}?page=1&page_size=50` - Get messages
- `PUT /api/v1/messages/{id}` - Edit message
- `DELETE /api/v1/messages/{id}` - Delete message
- `POST /api/v1/messages/{id}/reactions` - Add reaction
- `DELETE /api/v1/messages/{id}/reactions/{emoji}` - Remove reaction
- `POST /api/v1/messages/search` - Search messages

### Socket.IO Events
- `connect` - Connect with auth token
- `join_channel` - Join channel room
- `leave_channel` - Leave channel room
- `send_message` - Send real-time message
- `typing_start/typing_stop` - Typing indicators
- `read_messages` - Mark as read

## Features
- JWT authentication
- Real-time messaging via Socket.IO
- Direct messages and group chats
- Reactions
- Message search
- Online status
- Typing indicators
- Read receipts
- User contacts and blocking