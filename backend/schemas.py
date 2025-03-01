# schemas.py
from pydantic import BaseModel
from datetime import date

class DomainSummaryBase(BaseModel):
    domain: str
    date: date
    traffic_clicks: int
    impressions: int
    ctr: float
    avg_position: float
    pages_indexed: int
    pages_not_indexed: int

    class Config:
        orm_mode = True

class DomainErrorBase(BaseModel):
    domain: str
    date: date
    error_type: str
    count: int

    class Config:
        orm_mode = True

class CountrySummaryBase(BaseModel):
    domain: str
    date: date
    country: str
    traffic_clicks: int
    impressions: int
    ctr: float
    avg_position: float

    class Config:
        orm_mode = True
