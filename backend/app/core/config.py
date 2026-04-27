from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Daily Routine Tracker"
    DATABASE_URL: str = "driver://user:pass@localhost/dbname"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
