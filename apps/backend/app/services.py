import json

from fastapi import HTTPException
from openai import AsyncAzureOpenAI

from .config import get_settings


async def generate_exercise() -> dict:
    settings = get_settings()

    if not settings.azure_openai_endpoint or not settings.azure_openai_api_key or not settings.azure_openai_deployment:
        raise HTTPException(
            status_code=503,
            detail="Azure OpenAI configuration is missing. Please set azure_openai_endpoint, azure_openai_deployment, and azure_openai_api_key.",
        )

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
                "Return JSON with fields: title (string), language (string), explanation (short paragraph), "
                "starter_code (a minimal code snippet with TODOs). Do not include the full solution."
            ),
        },
        {
            "role": "user",
            "content": (
                "Create one beginner-friendly coding exercise in a single programming language. "
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
        return json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Failed to parse exercise response.") from exc
