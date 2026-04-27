from pydantic import BaseModel, ConfigDict
from typing import Literal
from datetime import datetime, date

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

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: int | None = None
    is_completed: bool | None = None
    links: list[TaskLink] | None = None

class TaskPublic(TaskBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class TaskLogBase(BaseModel):
    task_id: int
    target_date: date
    is_completed: bool = False

class TaskLogPublic(TaskLogBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class TaskLogWithTask(TaskLogPublic):
    task: TaskPublic

class DailyStats(BaseModel):
    date: date
    total_tasks: int
    completed_tasks: int

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
