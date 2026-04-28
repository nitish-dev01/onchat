from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from chat_service.core.config import settings
from chat_service.api import auth, users, channels, messages
from chat_service.models.database import init_db

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS - Allow Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://onchat-app.vercel.app",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(channels.router, prefix=settings.API_V1_STR)
app.include_router(messages.router, prefix=settings.API_V1_STR)


@app.on_event("startup")
async def startup_event():
    await init_db()


@app.get("/")
async def root():
    return {"message": "OnChat API", "version": settings.VERSION}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}