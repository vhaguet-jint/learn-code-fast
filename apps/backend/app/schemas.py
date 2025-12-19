import uuid
from typing import Literal

from pydantic import BaseModel, Field

Difficulty = Literal["easy", "medium", "hard"]


class ExerciseRequest(BaseModel):
    topic: str | None = Field(default=None, description="Topic to seed the generated exercise")
    difficulty: Difficulty = Field(default="easy")
    language: str = Field(default="python")


class ExerciseResponse(BaseModel):
    id: uuid.UUID
    title: str
    difficulty: Difficulty
    prompt_markdown: str
    starter_code: str
    language: str

    class Config:
        from_attributes = True


class CodeExecutionRequest(BaseModel):
    code: str
    language: str


class RunResult(BaseModel):
    stdout: str
    stderr: str
    duration_ms: int = Field(ge=0)


class SubmissionDetails(BaseModel):
    tests_run: int = 0
    tests_failed: int = 0


class SubmissionResult(RunResult):
    status: Literal["passed", "failed"]
    score: float
    details: SubmissionDetails
