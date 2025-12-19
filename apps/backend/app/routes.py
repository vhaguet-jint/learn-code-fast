import uuid

from fastapi import APIRouter, Body, Depends, Path
from sqlalchemy.orm import Session

from .celery_app import echo
from .config import get_settings
from .db import get_session
from .schemas import (
    CodeExecutionRequest,
    ExerciseRequest,
    ExerciseResponse,
    RunResult,
    SubmissionResult,
)
from .services import (
    generate_exercise,
    get_exercise_or_404,
    run_code,
    save_exercise,
    submit_code,
)

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


@router.post(
    "/exercises/generate",
    summary="Generate a coding exercise",
    response_model=ExerciseResponse,
)
async def create_exercise(
    payload: ExerciseRequest, session: Session = Depends(get_session)
):
    exercise_payload = await generate_exercise(payload)
    exercise = save_exercise(session, exercise_payload)
    return ExerciseResponse.model_validate(exercise)


@router.get(
    "/exercises/{exercise_id}",
    summary="Retrieve an existing exercise",
    response_model=ExerciseResponse,
)
async def read_exercise(
    exercise_id: uuid.UUID = Path(..., description="Exercise identifier"),
    session: Session = Depends(get_session),
):
    exercise = get_exercise_or_404(session, exercise_id)
    return ExerciseResponse.model_validate(exercise)


@router.post(
    "/exercises/{exercise_id}/run",
    summary="Execute code for an exercise",
    response_model=RunResult,
)
async def run_exercise(
    payload: CodeExecutionRequest,
    exercise_id: uuid.UUID = Path(..., description="Exercise identifier"),
    session: Session = Depends(get_session),
):
    exercise = get_exercise_or_404(session, exercise_id)
    return run_code(session, exercise, payload)


@router.post(
    "/exercises/{exercise_id}/submit",
    summary="Submit solution for an exercise",
    response_model=SubmissionResult,
)
async def submit_exercise(
    payload: CodeExecutionRequest,
    exercise_id: uuid.UUID = Path(..., description="Exercise identifier"),
    session: Session = Depends(get_session),
):
    exercise = get_exercise_or_404(session, exercise_id)
    return submit_code(session, exercise, payload)
