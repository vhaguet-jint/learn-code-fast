from celery import Celery

from .config import get_settings

settings = get_settings()

broker_url = settings.celery_broker_url or settings.redis_url
result_backend = settings.celery_result_backend or settings.redis_url

celery = Celery(
    "worker",
    broker=broker_url,
    backend=result_backend,
)

celery.conf.task_routes = {"app.tasks.*": {"queue": "default"}}


@celery.task()
def echo(message: str) -> str:
    return f"echo: {message}"
