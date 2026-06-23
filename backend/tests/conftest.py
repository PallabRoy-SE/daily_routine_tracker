import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.database import Base, get_db
from app.main import app
from app.models.models import Task, TaskLog, UserStats
from app.core.config import settings

# Deriving test database URL from settings.DATABASE_URL
base_url, _ = settings.DATABASE_URL.rsplit('/', 1)
TEST_DATABASE_URL = f"{base_url}/gamified_tasks_test"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_test_db_if_not_exists():
    postgres_url = f"{base_url}/postgres"
    temp_engine = create_async_engine(postgres_url, isolation_level="AUTOCOMMIT")
    async with temp_engine.connect() as conn:
        try:
            await conn.execute(text("CREATE DATABASE gamified_tasks_test"))
        except Exception:
            # Ignore database exists or other creation errors
            pass
    await temp_engine.dispose()
    yield

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db(create_test_db_if_not_exists):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db
