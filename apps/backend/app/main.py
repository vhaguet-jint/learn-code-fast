from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import Base, engine
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


@app.on_event("startup")
def on_startup() -> None:
    import time
    from sqlalchemy.exc import OperationalError
    
    max_retries = 20
    retry_interval = 1
    
    for i in range(max_retries):
        try:
            # Try to connect to verify database is ready
            with engine.connect() as connection:
                print("Database connection successful!")
                break
        except OperationalError as e:
            if i == max_retries - 1:
                print(f"Failed to connect to database after {max_retries} attempts. Exiting.")
                raise e
            print(f"Database not ready ({e}). Retrying in {retry_interval}s... ({i+1}/{max_retries})")
            time.sleep(retry_interval)

    Base.metadata.create_all(bind=engine)


@app.get("/config", summary="Return configuration hints")
async def read_config():
    return {
        "app_name": settings.app_name,
        "environment": settings.environment,
        "azure_openai_endpoint": settings.azure_openai_endpoint,
        "azure_openai_deployment": settings.azure_openai_deployment,
    }
