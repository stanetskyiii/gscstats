# country_models.py
from sqlalchemy import Column, Integer, String, Date, Float
from country_database import Base

class CountrySummary(Base):
    __tablename__ = "country_summaries"
    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, index=True)
    date = Column(Date, index=True)
    country = Column(String, index=True)
    traffic_clicks = Column(Integer)
    impressions = Column(Integer)
    ctr = Column(Float)
    avg_position = Column(Float)
