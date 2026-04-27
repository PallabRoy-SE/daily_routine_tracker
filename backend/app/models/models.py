from datetime import datetime, date
from sqlalchemy import DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
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

    logs: Mapped[list["TaskLog"]] = relationship(back_populates="task", cascade="all, delete-orphan")

class TaskLog(Base):
    __tablename__ = "task_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"))
    target_date: Mapped[date] = mapped_column(Date, index=True)
    is_completed: Mapped[bool] = mapped_column(default=False)

    task: Mapped["Task"] = relationship(back_populates="logs")

class UserStats(Base):
    __tablename__ = "user_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    xp: Mapped[int] = mapped_column(default=0)
    current_streak: Mapped[int] = mapped_column(default=0)
    max_streak: Mapped[int] = mapped_column(default=0)
    last_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
