# models.py
from sqlalchemy import Column, Integer, String, Date, Float
from database import Base

class DomainSummary(Base):
    __tablename__ = "domain_summaries"
    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, index=True)
    date = Column(Date, index=True)
    traffic_clicks = Column(Integer)      # клики
    impressions = Column(Integer)         # показы
    ctr = Column(Float)                   # CTR
    avg_position = Column(Float)          # средняя позиция
    pages_indexed = Column(Integer)       # количество страниц в индексе
    pages_not_indexed = Column(Integer)   # количество страниц вне индекса

class DomainError(Base):
    __tablename__ = "domain_errors"
    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, index=True)
    date = Column(Date, index=True)
    error_type = Column(String)           # тип ошибки
    count = Column(Integer)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
