from fastapi import APIRouter, Body

from .celery_app import echo
from .config import get_settings
from .services import generate_exercise

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


@router.post("/exercises", summary="Generate a coding exercise")
async def create_exercise():
    return await generate_exercise()
