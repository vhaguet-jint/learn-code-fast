from fastapi import APIRouter, Body

from .celery_app import echo
from .config import get_settings

router = APIRouter()


@router.get("/", summary="Hello world")
async def root():
    settings = get_settings()
    return {
        "message": "Welcome to Learn Code Fast API",
        "environment": settings.environment,
        "azure_openai_endpoint": settings.azure_openai_endpoint,
    }


@router.get("/health", summary="Health check")
async def health():
    return {"status": "ok"}


@router.post("/jobs/echo", summary="Submit a hello-world task")
async def submit_echo(message: str = Body("ping", embed=True)):
    task = echo.delay(message)
    return {"task_id": task.id, "status": task.status}
