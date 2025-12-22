from datetime import datetime

from .schemas import LanguageProficiency, LearningPreference, UserContext, UserProfile


def _default_languages() -> list[LanguageProficiency]:
    return [
        LanguageProficiency(
            name="python",
            proficiency="advanced",
            years_experience=5,
            primary_frameworks=["fastapi", "pydantic", "pytest"],
        ),
        LanguageProficiency(
            name="javascript",
            proficiency="intermediate",
            years_experience=3,
            primary_frameworks=["react", "node"],
        ),
    ]


def _default_learning_preferences() -> list[LearningPreference]:
    return [
        LearningPreference(modality="project-based", notes="Prefers building small tools and scripts."),
        LearningPreference(modality="reading", notes="Enjoys concise reference material alongside examples."),
    ]


def _default_profile() -> UserProfile:
    return UserProfile(
        role="self-directed learner",
        age_range="25-34",
        timezone="UTC",
        preferred_languages=["en"],
        learning_preferences=_default_learning_preferences(),
    )


def build_user_context(user_id: str) -> UserContext:
    """Return a backend-managed context snapshot for the given user.

    This is a placeholder implementation. Future iterations will load the
    context from persistent storage and merge updates from analytical pipelines.
    """

    return UserContext(
        user_id=user_id,
        profile=_default_profile(),
        languages=_default_languages(),
        learning_goals=[
            "Strengthen debugging workflows",
            "Prepare for technical interviews focused on system design",
            "Improve code readability and documentation habits",
        ],
        strengths=["Problem decomposition", "Python tooling", "Testing mindset"],
        opportunities=["Low-level systems knowledge", "Advanced TypeScript patterns"],
        last_updated=datetime.utcnow(),
        version="v1",
    )
