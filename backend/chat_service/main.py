from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from socketio import AsyncServer, ASGIApp
from chat_service.core.config import settings
from chat_service.api import auth, users, channels, messages
from chat_service.models.database import init_db


# Socket.IO setup
sio = AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['*'],
    transports=['websocket', 'polling']
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)
from fastapi import Request

@app.middleware("http")
async def force_cors(request: Request, call_next):
    response = await call_next(request)

    origin = request.headers.get("origin")

    if origin and (".vercel.app" in origin or ".railway.app" in origin or "railway.com" in origin):
        response.headers["Access-Control-Allow-Origin"] = origin

    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"

    return response

# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")

@sio.event
async def message(sid, data):
    await sio.emit('response', {'data': data}, to=sid)

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(channels.router, prefix=settings.API_V1_STR)
app.include_router(messages.router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {"message": "OnChat API", "version": settings.VERSION}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Mount Socket.IO to the app
app = ASGIApp(sio, app)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("chat_service.main:app", host="0.0.0.0", port=8000, reload=True)