from pydantic import BaseModel, ConfigDict
from typing import Literal
from datetime import datetime

class TaskLink(BaseModel):
    url: str
    label: str
    action: Literal["new_tab", "download", "internal_link"]

class TaskBase(BaseModel):
    title: str
    description: str | None = None
    priority: int = 1
    is_completed: bool = False
    links: list[TaskLink] | None = []

class TaskCreate(TaskBase):
    pass

class TaskPublic(TaskBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class UserStatsBase(BaseModel):
    xp: int = 0
    current_streak: int = 0
    max_streak: int = 0
    last_completed_at: datetime | None = None

class UserStatsPublic(UserStatsBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CompletionResponse(BaseModel):
    task: TaskPublic
    user_stats: UserStatsPublic
