# country_database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import COUNTRY_DATABASE_URL

engine = create_engine(
    COUNTRY_DATABASE_URL,
    pool_size=10,
    max_overflow=5,
    pool_timeout=30
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
