from datetime import datetime
from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(index=True)
    description: Mapped[str | None]
    priority: Mapped[int] = mapped_column(default=1)  # 1: Low, 2: Medium, 3: High
    is_completed: Mapped[bool] = mapped_column(default=False)
    links: Mapped[list[dict] | None] = mapped_column(JSONB, default=list)

class UserStats(Base):
    __tablename__ = "user_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    xp: Mapped[int] = mapped_column(default=0)
    current_streak: Mapped[int] = mapped_column(default=0)
    max_streak: Mapped[int] = mapped_column(default=0)
    last_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
