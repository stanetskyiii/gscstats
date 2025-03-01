# main.py
from fastapi import FastAPI, Depends
from database import engine, Base, SessionLocal
from models import DomainSummary, DomainError
from schemas import DomainSummaryBase, DomainErrorBase, CountrySummaryBase
from auth import get_current_username
from cron_job import start_scheduler
from sqlalchemy.orm import Session
from datetime import date
from fastapi.middleware.cors import CORSMiddleware

# Импорт для работы с базой данных стран
from country_database import SessionLocal as CountrySessionLocal
from country_models import CountrySummary

# Создаем таблицы в основной БД, если их ещё нет
Base.metadata.create_all(bind=engine)

app = FastAPI(title="GSC Stats API")

# Настройка CORS - улучшенные настройки для решения проблем с запросами
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене замените на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]  # Добавлено для работы с заголовками аутентификации
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def country_get_db():
    db = CountrySessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/summary", response_model=list[DomainSummaryBase])
def get_summary(target_date: date, db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    """Получить сводку по всем доменам на указанную дату"""
    try:
        summaries = db.query(DomainSummary).filter(DomainSummary.date == target_date).all()
        return summaries
    except Exception as e:
        # Логирование ошибки
        print(f"Error in get_summary for {target_date}: {e}")
        return []

@app.get("/api/domain/{domain_name}/summary", response_model=DomainSummaryBase)
def get_domain_summary(domain_name: str, target_date: date, db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    """Получить сводку по указанному домену на указанную дату"""
    try:
        summary = db.query(DomainSummary).filter(DomainSummary.domain == domain_name, DomainSummary.date == target_date).first()
        if not summary:
            return {"error": "Данные не найдены"}
        return summary
    except Exception as e:
        # Логирование ошибки
        print(f"Error in get_domain_summary for {domain_name} on {target_date}: {e}")
        return {"error": f"Ошибка получения данных: {str(e)}"}

@app.get("/api/domain/{domain_name}/errors", response_model=list[DomainErrorBase])
def get_domain_errors(domain_name: str, target_date: date, db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    """Получить ошибки для указанного домена на указанную дату"""
    try:
        errors = db.query(DomainError).filter(DomainError.domain == domain_name, DomainError.date == target_date).all()
        return errors
    except Exception as e:
        # Логирование ошибки
        print(f"Error in get_domain_errors for {domain_name} on {target_date}: {e}")
        return []

# Маршруты для работы с данными по странам

@app.get("/api/country_summary", response_model=list[CountrySummaryBase])
def get_country_summary(target_date: date, db: Session = Depends(country_get_db), username: str = Depends(get_current_username)):
    """Получить сводку по всем странам на указанную дату"""
    try:
        summaries = db.query(CountrySummary).filter(CountrySummary.date == target_date).all()
        return summaries
    except Exception as e:
        # Логирование ошибки
        print(f"Error in get_country_summary for {target_date}: {e}")
        return []

@app.get("/api/country/{country}/summary", response_model=list[CountrySummaryBase])
def get_country_domain_summary(country: str, target_date: date, db: Session = Depends(country_get_db), username: str = Depends(get_current_username)):
    """Получить сводку по всем доменам для указанной страны на указанную дату"""
    try:
        summaries = db.query(CountrySummary).filter(
            CountrySummary.country == country,
            CountrySummary.date == target_date
        ).all()
        return summaries
    except Exception as e:
        # Логирование ошибки
        print(f"Error in get_country_domain_summary for {country} on {target_date}: {e}")
        return []

# Новые маршруты для оптимизации запросов

@app.get("/api/domain_range_summary")
def get_domain_range_summary(domain_name: str, start_date: date, end_date: date, db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    """Получить сводку по указанному домену за диапазон дат в одном запросе"""
    try:
        summaries = db.query(DomainSummary).filter(
            DomainSummary.domain == domain_name,
            DomainSummary.date >= start_date,
            DomainSummary.date <= end_date
        ).all()
        return summaries
    except Exception as e:
        # Логирование ошибки
        print(f"Error in get_domain_range_summary for {domain_name} from {start_date} to {end_date}: {e}")
        return []

@app.get("/api/country_range_summary")
def get_country_range_summary(country: str, start_date: date, end_date: date, db: Session = Depends(country_get_db), username: str = Depends(get_current_username)):
    """Получить сводку по указанной стране за диапазон дат в одном запросе"""
    try:
        summaries = db.query(CountrySummary).filter(
            CountrySummary.country == country,
            CountrySummary.date >= start_date,
            CountrySummary.date <= end_date
        ).all()
        return summaries
    except Exception as e:
        # Логирование ошибки
        print(f"Error in get_country_range_summary for {country} from {start_date} to {end_date}: {e}")
        return []

# Маршрут для проверки состояния API
@app.get("/api/health")
def health_check():
    """Проверка работоспособности API"""
    return {"status": "ok", "message": "API работает нормально"}

# Запуск планировщика
start_scheduler()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)