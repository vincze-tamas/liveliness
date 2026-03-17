from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from config import settings

engine = create_async_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


def _migrate_add_missing_columns(conn: Any) -> None:
    """Add columns that exist in ORM models but are missing from the SQLite DB.

    SQLAlchemy's create_all only creates tables; it never alters existing ones.
    This function runs ALTER TABLE ADD COLUMN for any column gap so that the
    app can evolve its schema without a full Alembic setup.
    """
    from sqlalchemy import inspect, text

    inspector = inspect(conn)
    for table in Base.metadata.sorted_tables:
        if not inspector.has_table(table.name):
            continue  # table not yet created; create_all will handle it
        existing = {col["name"] for col in inspector.get_columns(table.name)}
        for col in table.columns:
            if col.name not in existing:
                col_type = col.type.compile(conn.dialect)
                nullable = "NULL" if col.nullable else "NOT NULL"
                default = f" DEFAULT {col.default.arg!r}" if col.default is not None else ""
                conn.execute(
                    text(
                        f"ALTER TABLE {table.name} ADD COLUMN"
                        f" {col.name} {col_type} {nullable}{default}"
                    )
                )


async def create_tables() -> None:
    # Import all models so SQLAlchemy picks them up before create_all
    import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)
        await conn.run_sync(_migrate_add_missing_columns)
