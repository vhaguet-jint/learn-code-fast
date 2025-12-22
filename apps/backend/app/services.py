import json
import time
import uuid
from typing import Any

from fastapi import HTTPException
from openai import AsyncAzureOpenAI
from sqlalchemy.orm import Session

from .config import get_settings
from .models import Exercise, Submission
from .schemas import (
    ChatBatchResponse,
    ChatRequest,
    ConversationMessage,
    CodeExecutionRequest,
    ExerciseRequest,
    RunResult,
    SubmissionDetails,
    SubmissionResult,
)


def _fallback_exercise(payload: ExerciseRequest) -> dict[str, Any]:
    topic = payload.topic or "strings"
    difficulty = payload.difficulty
    language = payload.language
    title = f"{topic.title()} practice"

    prompt_markdown = (
        f"### Goal\n"
        f"Build a small function that demonstrates basic **{topic}** handling.\n\n"
        f"### Requirements\n"
        f"- Provide a solution in **{language}**\n"
        f"- Keep the difficulty around **{difficulty}**\n"
        f"- Return a value rather than printing directly\n"
    )

    starter_code = (
        "# Starter generated locally because Azure OpenAI is not configured\n"
        "def solution(input_value):\n"
        "    \"\"\"Replace with your implementation.\"\"\"\n"
        "    return input_value\n"
    )

    return {
        "title": title,
        "language": language,
        "difficulty": difficulty,
        "prompt_markdown": prompt_markdown,
        "starter_code": starter_code,
    }


async def generate_exercise(payload: ExerciseRequest) -> dict:
    settings = get_settings()

    if not settings.azure_openai_endpoint or not settings.azure_openai_api_key or not settings.azure_openai_deployment:
        return _fallback_exercise(payload)

    client = AsyncAzureOpenAI(
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        azure_endpoint=settings.azure_openai_endpoint,
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You create concise coding exercises that can be solved in about 5 minutes. "
                "Return JSON with fields: title (string), language (string), difficulty (easy|medium|hard), "
                "prompt_markdown (string), starter_code (a minimal code snippet with TODOs). "
                "Do not include the full solution."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Create one coding exercise in {payload.language} at {payload.difficulty} difficulty. "
                "Provide only the requested JSON fields."
            ),
        },
    ]

    completion = await client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=messages,
        temperature=0.6,
        response_format={"type": "json_object"},
        max_tokens=350,
    )

    raw_content = completion.choices[0].message.content or "{}"
    try:
        data = json.loads(raw_content)
        data.setdefault("difficulty", payload.difficulty)
        data.setdefault("language", payload.language)
        data.setdefault("title", payload.topic or "Generated exercise")
        data.setdefault("prompt_markdown", "### Exercise\nFill in the solution.")
        data.setdefault("starter_code", "# TODO: implement solution\n")
        return data
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Failed to parse exercise response.") from exc


def save_exercise(session: Session, exercise_payload: dict) -> Exercise:
    exercise = Exercise(
        title=exercise_payload["title"],
        difficulty=exercise_payload["difficulty"],
        language=exercise_payload["language"],
        prompt_markdown=exercise_payload["prompt_markdown"],
        starter_code=exercise_payload["starter_code"],
    )
    session.add(exercise)
    session.commit()
    session.refresh(exercise)
    return exercise


def get_exercise_or_404(session: Session, exercise_id: uuid.UUID) -> Exercise:
    exercise = session.get(Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise


def run_code(session: Session, exercise: Exercise, payload: CodeExecutionRequest) -> RunResult:
    start = time.perf_counter()
    # Placeholder execution hook; this should call a real sandbox in production.
    stdout = f"echo: received {len(payload.code.splitlines())} lines of {payload.language} code."
    stderr = ""
    duration_ms = int((time.perf_counter() - start) * 1000)

    submission = Submission(
        exercise_id=exercise.id,
        code=payload.code,
        language=payload.language,
        status="ran",
        stdout=stdout,
        stderr=stderr,
        duration_ms=duration_ms,
    )
    session.add(submission)
    session.commit()

    return RunResult(stdout=stdout, stderr=stderr, duration_ms=duration_ms)


def submit_code(session: Session, exercise: Exercise, payload: CodeExecutionRequest) -> SubmissionResult:
    run_result = run_code(session, exercise, payload)
    # Simple scoring heuristic; in the absence of real tests we mark everything passed.
    details = SubmissionDetails(tests_run=1, tests_failed=0)
    status = "passed" if not run_result.stderr else "failed"

    submission = Submission(
        exercise_id=exercise.id,
        code=payload.code,
        language=payload.language,
        status=status,
        stdout=run_result.stdout,
        stderr=run_result.stderr,
        duration_ms=run_result.duration_ms,
        score=1.0 if status == "passed" else 0.0,
        tests_run=details.tests_run,
        tests_failed=details.tests_failed,
    )
    session.add(submission)
    session.commit()

    return SubmissionResult(
        status=status,
        score=float(submission.score or 0.0),
        stdout=run_result.stdout,
        stderr=run_result.stderr,
        duration_ms=run_result.duration_ms,
        details=details,
    )


def _build_chat_messages(
    payload: ChatRequest, exercise: Exercise | None
) -> list[dict[str, str]]:
    system_parts: list[str] = [
        "You are a helpful coding tutor guiding a learner through a short exercise.",
        "Be concise and focus on actionable suggestions.",
    ]
    if exercise:
        system_parts.append(
            f"Exercise context: {exercise.title} (difficulty: {exercise.difficulty}, language: {exercise.language})."
        )
        system_parts.append(f"Prompt: {exercise.prompt_markdown}")

    messages: list[dict[str, str]] = [
        {"role": "system", "content": " ".join(system_parts)},
    ]

    for item in payload.conversation_history:
        if item.role in {"user", "assistant", "system"}:
            messages.append({"role": item.role, "content": item.content})

    messages.append({"role": "user", "content": payload.message})
    return messages


def _fallback_chat_response(payload: ChatRequest, exercise: Exercise | None) -> str:
    intro = ""
    if exercise:
        intro = f"I'll help with the exercise '{exercise.title}'. "
    history_hint = (
        f"Previously we discussed {len(payload.conversation_history)} messages. "
        if payload.conversation_history
        else ""
    )
    return f"{intro}{history_hint}Here is a quick hint: try breaking the problem into small steps and test your code frequently."


async def _perform_chat_completion(
    payload: ChatRequest, exercise: Exercise | None
) -> tuple[str, int]:
    settings = get_settings()
    if not settings.azure_openai_endpoint or not settings.azure_openai_api_key or not settings.azure_openai_deployment:
        fallback_text = _fallback_chat_response(payload, exercise)
        return fallback_text, 0

    client = AsyncAzureOpenAI(
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        azure_endpoint=settings.azure_openai_endpoint,
    )

    messages = _build_chat_messages(payload, exercise)
    completion = await client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=messages,
        temperature=0.4,
        max_tokens=350,
    )

    content = completion.choices[0].message.content or ""
    tokens_used = completion.usage.total_tokens if completion.usage else 0
    return content, tokens_used


async def chat_batch_response(payload: ChatRequest, exercise: Exercise | None) -> ChatBatchResponse:
    content, tokens_used = await _perform_chat_completion(payload, exercise)
    return ChatBatchResponse(response=content, tokens_used=tokens_used)


async def chat_stream_response(payload: ChatRequest, exercise: Exercise | None):
    content, _ = await _perform_chat_completion(payload, exercise)

    async def _gen():
        if not content:
            yield "data: {\"type\": \"done\"}\n\n"
            return

        chunk_size = 400
        for idx in range(0, len(content), chunk_size):
            chunk = content[idx : idx + chunk_size]
            message = json.dumps({"type": "message", "content": chunk})
            yield f"data: {message}\n\n"

        yield "data: {\"type\": \"done\"}\n\n"

    return _gen()
