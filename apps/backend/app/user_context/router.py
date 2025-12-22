from fastapi import APIRouter, Query

from .schemas import UserContext
from .service import build_user_context

router = APIRouter(prefix="/user-context", tags=["user-context"])


@router.get("", summary="Get backend-managed user context", response_model=UserContext)
async def get_user_context(
    user_id: str = Query(
        default="demo-user",
        description="Backend user identifier; future versions will map this to authenticated users",
    )
) -> UserContext:
    """Retrieve the backend user context snapshot.

    The backend maintains a long-lived understanding of the learner. The frontend
    can merge this payload with transient context such as chat history, current
    code, or terminal output before calling downstream services.
    """

    return build_user_context(user_id)
