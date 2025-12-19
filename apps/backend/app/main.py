from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import router

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/config", summary="Return configuration hints")
async def read_config():
    return {
        "app_name": settings.app_name,
        "environment": settings.environment,
        "azure_openai_endpoint": settings.azure_openai_endpoint,
        "azure_openai_deployment": settings.azure_openai_deployment,
    }
