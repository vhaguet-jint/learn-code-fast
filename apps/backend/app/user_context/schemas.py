from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ProficiencyLevel = Literal["beginner", "intermediate", "advanced", "expert"]


class LanguageProficiency(BaseModel):
    name: str = Field(description="Programming language name")
    proficiency: ProficiencyLevel = Field(description="Self-reported proficiency level")
    years_experience: float | None = Field(
        default=None,
        description="Years of experience with the language",
        ge=0,
    )
    primary_frameworks: list[str] = Field(
        default_factory=list,
        description="Frameworks or libraries the learner prefers for this language",
    )


class LearningPreference(BaseModel):
    modality: str = Field(description="Preferred learning modality (e.g., reading, projects)")
    notes: str | None = Field(default=None, description="Additional context about the modality preference")


class UserProfile(BaseModel):
    role: str = Field(default="learner", description="Short description of the learner role")
    age_range: str | None = Field(
        default=None,
        description="Approximate age range for the learner (e.g., '18-24', '25-34')",
    )
    timezone: str | None = Field(default=None, description="Learner timezone for scheduling purposes")
    preferred_languages: list[str] = Field(
        default_factory=list,
        description="Natural languages the learner prefers for explanations",
    )
    learning_preferences: list[LearningPreference] = Field(
        default_factory=list,
        description="Details about how the learner prefers to absorb information",
    )


class UserContext(BaseModel):
    user_id: str = Field(description="Backend identifier for the learner")
    profile: UserProfile = Field(description="High-level learner profile metadata")
    languages: list[LanguageProficiency] = Field(
        default_factory=list,
        description="Programming languages the learner is familiar with",
    )
    learning_goals: list[str] = Field(default_factory=list, description="Goals the learner is actively pursuing")
    strengths: list[str] = Field(default_factory=list, description="Areas where the learner feels confident")
    opportunities: list[str] = Field(
        default_factory=list,
        description="Areas where the learner wants targeted practice",
    )
    last_updated: datetime = Field(description="Last update timestamp of the backend context")
    version: str = Field(description="User context schema version")
