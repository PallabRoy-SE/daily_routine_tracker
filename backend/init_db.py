import asyncio
import sys
from pathlib import Path

# Add the current directory to sys.path to allow importing from the 'app' package
sys.path.append(str(Path(__file__).parent))

from app.core.database import engine, Base
# Import models to ensure they are registered with Base.metadata
from app.models.models import Task, UserStats

async def init_db():
    async with engine.begin() as conn:
        print("Dropping all existing tables...")
        await conn.run_sync(Base.metadata.drop_all)
        
        print("Creating database schema...")
        await conn.run_sync(Base.metadata.create_all)
        
    print("Database initialization complete.")

if __name__ == "__main__":
    asyncio.run(init_db())
