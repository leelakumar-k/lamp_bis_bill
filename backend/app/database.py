from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

engine = create_engine(
    settings.get_clean_database_url(),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Ensure schema search_path is always set to main_restaurants
@event.listens_for(engine, "connect")
def set_search_path(dbapi_connection, connection_record):
    with dbapi_connection.cursor() as cursor:
        cursor.execute(f"SET search_path TO {settings.DB_SCHEMA}, public;")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
