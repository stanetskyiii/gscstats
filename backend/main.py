from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware

from database import engine, Base, SessionLocal
from models import DomainSummary, DomainError
from schemas import DomainSummaryBase, DomainErrorBase, CountrySummaryBase
from auth import get_current_username
from sqlalchemy.orm import Session
from datetime import date, timedelta
import json
import logging
import sys

# Импорт для работы с серверным кэшированием
from server_cache import cache_response, invalidate_cache, compress_response, decompress_response

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("gsc_stats.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("gsc_stats")

# Импорт для работы с базой данных стран
from country_database import SessionLocal as CountrySessionLocal
from country_models import CountrySummary

# Импортируем функции для получения данных из GSC
from gsc_client import fetch_gsc_data_for_domain, fetch_country_data_for_domain
from config import DOMAINS

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

# Добавляем промежуточное ПО для сжатия ответов
app.add_middleware(GZipMiddleware, minimum_size=1000)

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
        logger.error(f"Error in get_summary for {target_date}: {e}")
        return []

@app.get("/api/domain/{domain_name}/summary")
def get_domain_summary(domain_name: str, target_date: date, db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    """Получить сводку по указанному домену на указанную дату"""
    try:
        summary = db.query(DomainSummary).filter(
            DomainSummary.domain == domain_name,
            DomainSummary.date == target_date
        ).first()
        if not summary:
            # Вместо возврата ошибки возвращаем пустой объект с нулевыми значениями
            return {
                "domain": domain_name,
                "date": target_date,
                "traffic_clicks": 0,
                "impressions": 0,
                "ctr": 0.0,
                "avg_position": 0.0,
                "pages_indexed": 0,
                "pages_not_indexed": 0
            }
        return summary
    except Exception as e:
        # Логирование ошибки
        logger.error(f"Error in get_domain_summary for {domain_name} on {target_date}: {e}")
        # Также возвращаем пустой объект вместо ошибки
        return {
            "domain": domain_name,
            "date": target_date,
            "traffic_clicks": 0,
            "impressions": 0,
            "ctr": 0.0,
            "avg_position": 0.0,
            "pages_indexed": 0,
            "pages_not_indexed": 0
        }

@app.get("/api/domain/{domain_name}/errors", response_model=list[DomainErrorBase])
def get_domain_errors(domain_name: str, target_date: date, db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    """Получить ошибки для указанного домена на указанную дату"""
    try:
        errors = db.query(DomainError).filter(
            DomainError.domain == domain_name,
            DomainError.date == target_date
        ).all()
        return errors
    except Exception as e:
        # Логирование ошибки
        logger.error(f"Error in get_domain_errors for {domain_name} on {target_date}: {e}")
        return []

@app.get("/api/country_summary", response_model=list[CountrySummaryBase])
def get_country_summary(target_date: date, db: Session = Depends(country_get_db), username: str = Depends(get_current_username)):
    """Получить сводку по всем странам на указанную дату"""
    try:
        summaries = db.query(CountrySummary).filter(CountrySummary.date == target_date).all()
        return summaries
    except Exception as e:
        # Логирование ошибки
        logger.error(f"Error in get_country_summary for {target_date}: {e}")
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
        logger.error(f"Error in get_country_domain_summary for {country} on {target_date}: {e}")
        return []

@app.get("/api/domain/{domain_name}/last_dates")
def get_domain_last_dates(domain_name: str, db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    """Получает две последние даты, для которых есть данные для указанного домена"""
    try:
        # Находим две последние даты с данными для домена
        last_dates = db.query(DomainSummary.date)\
            .filter(DomainSummary.domain == domain_name)\
            .order_by(DomainSummary.date.desc())\
            .limit(2)\
            .all()
        
        if not last_dates:
            return {"last_date": None, "second_last_date": None}
        
        result = {
            "last_date": last_dates[0][0].isoformat() if last_dates and len(last_dates) > 0 else None,
            "second_last_date": last_dates[1][0].isoformat() if last_dates and len(last_dates) > 1 else None
        }
        return result
    except Exception as e:
        logger.error(f"Error in get_domain_last_dates for {domain_name}: {e}")
        return {"last_date": None, "second_last_date": None}

@app.get("/api/all_domains_last_dates")
def get_all_domains_last_dates(db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    """Получает последние даты с данными для всех доменов"""
    try:
        # Для каждого домена находим последнюю дату
        result = {}
        for domain in DOMAINS:
            last_date = db.query(DomainSummary.date)\
                .filter(DomainSummary.domain == domain)\
                .order_by(DomainSummary.date.desc())\
                .first()
            result[domain] = last_date[0].isoformat() if last_date else None
        
        # Определяем общую последнюю дату (минимальную из всех последних)
        all_dates = [date for date in result.values() if date]
        last_common_date = min(all_dates) if all_dates else None
        
        # Находим самую последнюю дату среди всех доменов
        latest_date = max(all_dates) if all_dates else None
        
        return {
            "domain_dates": result,
            "last_common_date": last_common_date,
            "latest_date": latest_date,
            "total_domains": len(DOMAINS),
            "domains_with_data": len([d for d in result.values() if d])
        }
    except Exception as e:
        logger.error(f"Error in get_all_domains_last_dates: {e}")
        return {"error": str(e)}

@app.get("/api/summary_range")
def get_summary_range(start_date: date, end_date: date, db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    """Получить сводку по всем доменам за указанный диапазон дат с помощью одного запроса"""
    try:
        summaries = db.query(DomainSummary).filter(
            DomainSummary.date >= start_date,
            DomainSummary.date <= end_date
        ).all()
        return summaries
    except Exception as e:
        logger.error(f"Error in get_summary_range from {start_date} to {end_date}: {e}")
        return []

# Новые маршруты для оптимизации запросов - ИСПОЛЬЗУЙТЕ ИХ ВМЕСТО ПОШТУЧНЫХ ЗАПРОСОВ!
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
        logger.error(f"Error in get_domain_range_summary for {domain_name} from {start_date} to {end_date}: {e}")
        return []

# Обновлённый маршрут получения данных по странам с кэшированием и сжатием ответа
@app.get("/api/country_range_summary")
@cache_response(prefix="country_range", ttl=86400)  # кэшируем на 24 часа
async def get_country_range_summary(start_date: date, end_date: date, db: Session = Depends(country_get_db), username: str = Depends(get_current_username)):
    """Получить сводку по всем странам за диапазон дат в одном запросе с кэшированием"""
    try:
        summaries = db.query(CountrySummary).filter(
            CountrySummary.date >= start_date,
            CountrySummary.date <= end_date
        ).all()
        
        # Сжимаем ответ для уменьшения объема данных
        return compress_response(summaries)
    except Exception as e:
        # Логирование ошибки
        logger.error(f"Error in get_country_range_summary from {start_date} to {end_date}: {e}")
        return []

# Глобальный объект для хранения статуса обновления
update_status = {
    "domains_total": len(DOMAINS),
    "domains_processed": 0,
    "current_domain": "",
    "current_date": "",
    "status": "idle",
    "errors": [],
    "progress": 0
}

# Обновлённый маршрут для обновления данных с инвалидированием кэша
@app.post("/api/update_data")
async def update_database_data(request: Request, background_tasks: BackgroundTasks, username: str = Depends(get_current_username)):
    """Эндпоинт для обновления данных в базе данных."""
    global update_status

    # Если уже идет обновление, возвращаем текущий статус
    if update_status["status"] == "running" or update_status["status"] == "updating_countries":
        return {
            "status": update_status["status"],
            "progress": update_status["progress"],
            "message": f"Update already in progress. Processing {update_status['current_domain']}"
        }

    # Сбрасываем статус
    update_status = {
        "domains_total": len(DOMAINS),
        "domains_processed": 0,
        "current_domain": "",
        "current_date": "",
        "status": "running",
        "errors": [],
        "progress": 0
    }
    
    # Инвалидация кэша при обновлении данных
    invalidate_cache("country_range:*")
    invalidate_cache("api:get_country_range_summary:*")

    # Функция для обновления данных в фоне
    async def update_data_background():
        global update_status
        try:
            # Получаем максимальную доступную дату (вчера)
            yesterday = date.today() - timedelta(days=2)  # Берем позавчерашний день для гарантии наличия данных
            logger.info(f"Starting update from earliest missing date up to {yesterday}")

            for i, domain in enumerate(DOMAINS):
                try:
                    update_status["current_domain"] = domain

                    # Получаем последнюю дату с данными для домена
                    db_local = SessionLocal()
                    try:
                        last_dates = db_local.query(DomainSummary.date)\
                            .filter(DomainSummary.domain == domain)\
                            .order_by(DomainSummary.date.desc())\
                            .first()
                    finally:
                        db_local.close()

                    # Определяем начальную дату для обновления
                    start_date_update = None
                    if last_dates and last_dates[0]:
                        # Начинаем со следующего дня после последней даты
                        last_date = last_dates[0]
                        start_date_update = last_date + timedelta(days=1)
                        logger.info(f"For domain {domain}, last date in DB is {last_date}, starting from {start_date_update}")
                    else:
                        # Если нет данных, начинаем с 1 января 2024
                        start_date_update = date(2024, 1, 1)
                        logger.info(f"No data found for domain {domain}, starting from 2024-01-01")

                    # Если начальная дата больше вчера, то нечего обновлять
                    if start_date_update > yesterday:
                        logger.info(f"Domain {domain} is up to date (last date: {start_date_update - timedelta(days=1)})")
                        update_status["domains_processed"] += 1
                        update_status["progress"] = round((update_status["domains_processed"] / update_status["domains_total"]) * 100)
                        continue

                    # Запрашиваем данные для дат от start_date_update до вчера
                    for current_date in daterange(start_date_update, yesterday):
                        update_status["current_date"] = current_date.isoformat()
                        logger.info(f"Processing {domain} for date {current_date}")

                        try:
                            # Получаем данные из GSC
                            data = fetch_gsc_data_for_domain(domain, current_date)

                            # Если данных нет, пропускаем эту дату
                            if data is None:
                                logger.info(f"Skipping {domain} on {current_date} - no data available")
                                continue

                            # Проверяем, есть ли в данных ненулевые значения
                            has_data = (
                                data.get("traffic_clicks", 0) > 0 or 
                                data.get("impressions", 0) > 0 or 
                                data.get("ctr", 0.0) > 0 or 
                                data.get("avg_position", 0.0) > 0
                            )

                            if not has_data:
                                logger.info(f"Skipping {domain} on {current_date} - all metrics are zero")
                                continue

                            # Сохраняем данные в БД
                            db_local = SessionLocal()
                            try:
                                # Проверяем, есть ли уже запись для этой даты и домена
                                existing = db_local.query(DomainSummary).filter(
                                    DomainSummary.domain == domain,
                                    DomainSummary.date == current_date
                                ).first()

                                if existing:
                                    # Обновляем существующую запись
                                    existing.traffic_clicks = data.get("traffic_clicks", 0)
                                    existing.impressions = data.get("impressions", 0)
                                    existing.ctr = data.get("ctr", 0.0)
                                    existing.avg_position = data.get("avg_position", 0.0)
                                    existing.pages_indexed = data.get("pages_indexed", 0)
                                    existing.pages_not_indexed = data.get("pages_not_indexed", 0)
                                    logger.info(f"Updated existing data for {domain} on {current_date}")
                                else:
                                    # Создаем новую запись
                                    summary = DomainSummary(
                                        domain=domain,
                                        date=current_date,
                                        traffic_clicks=data.get("traffic_clicks", 0),
                                        impressions=data.get("impressions", 0),
                                        ctr=data.get("ctr", 0.0),
                                        avg_position=data.get("avg_position", 0.0),
                                        pages_indexed=data.get("pages_indexed", 0),
                                        pages_not_indexed=data.get("pages_not_indexed", 0)
                                    )
                                    db_local.add(summary)
                                    logger.info(f"Created new record for {domain} on {current_date}")

                                # Сохраняем ошибки, если они есть
                                errors = data.get("errors", {})
                                for error_type, count in errors.items():
                                    # Проверяем, есть ли уже запись для этой ошибки
                                    existing_error = db_local.query(DomainError).filter(
                                        DomainError.domain == domain,
                                        DomainError.date == current_date,
                                        DomainError.error_type == error_type
                                    ).first()

                                    if existing_error:
                                        existing_error.count = count
                                    else:
                                        domain_error = DomainError(
                                            domain=domain,
                                            date=current_date,
                                            error_type=error_type,
                                            count=count
                                        )
                                        db_local.add(domain_error)

                                db_local.commit()
                                logger.info(f"Data saved for {domain} on {current_date}")
                            except Exception as e:
                                db_local.rollback()
                                update_status["errors"].append(f"Error processing {domain} on {current_date}: {str(e)}")
                                logger.error(f"Error processing {domain} on {current_date}: {e}")
                            finally:
                                db_local.close()
                        except Exception as e:
                            update_status["errors"].append(f"Error fetching data for {domain} on {current_date}: {str(e)}")
                            logger.error(f"Error fetching data for {domain} on {current_date}: {e}")

                    update_status["domains_processed"] += 1
                    update_status["progress"] = round((update_status["domains_processed"] / update_status["domains_total"]) * 100)
                    logger.info(f"Completed processing domain {domain}, progress: {update_status['progress']}%")
                except Exception as e:
                    update_status["errors"].append(f"Error processing domain {domain}: {str(e)}")
                    logger.error(f"Error processing domain {domain}: {e}")
                    update_status["domains_processed"] += 1
                    update_status["progress"] = round((update_status["domains_processed"] / update_status["domains_total"]) * 100)

            # Обновляем данные по странам
            update_status["status"] = "updating_countries"
            update_status["current_domain"] = "Countries"
            update_status["domains_processed"] = 0
            update_status["progress"] = 0
            logger.info("Starting to update country data")

            for i, domain in enumerate(DOMAINS):
                try:
                    update_status["current_domain"] = f"Country data for {domain}"

                    # Получаем последние даты для домена
                    db_local = CountrySessionLocal()
                    try:
                        last_dates = db_local.query(CountrySummary.date)\
                            .filter(CountrySummary.domain == domain)\
                            .order_by(CountrySummary.date.desc())\
                            .limit(1)\
                            .all()
                    finally:
                        db_local.close()

                    # Определяем начальную дату для обновления
                    start_date_update = None
                    if last_dates and len(last_dates) > 0:
                        # Начинаем со следующего дня после последней даты
                        start_date_update = last_dates[0][0] + timedelta(days=1)
                        logger.info(f"For country data, domain {domain}, last date in DB is {last_dates[0][0]}, starting from {start_date_update}")
                    else:
                        # Если нет данных, начинаем с 1 января 2024
                        start_date_update = date(2024, 1, 1)
                        logger.info(f"No country data found for domain {domain}, starting from 2024-01-01")

                    # Если начальная дата больше вчера, то нечего обновлять
                    if start_date_update > yesterday:
                        logger.info(f"Country data for domain {domain} is up to date")
                        update_status["domains_processed"] += 1
                        update_status["progress"] = round((update_status["domains_processed"] / update_status["domains_total"]) * 100)
                        continue

                    # Запрашиваем данные для дат от start_date_update до вчера
                    for current_date in daterange(start_date_update, yesterday):
                        update_status["current_date"] = current_date.isoformat()
                        logger.info(f"Processing country data for {domain} on date {current_date}")

                        try:
                            # Получаем данные по странам из GSC
                            records = fetch_country_data_for_domain(domain, current_date)

                            if not records or len(records) == 0:
                                logger.info(f"No country data available for {domain} on {current_date}")
                                continue

                            logger.info(f"Received {len(records)} country records for {domain} on {current_date}")

                            # Сохраняем данные в БД
                            db_local = CountrySessionLocal()
                            try:
                                for record in records:
                                    # Проверяем, есть ли уже запись для этой даты, домена и страны
                                    existing = db_local.query(CountrySummary).filter(
                                        CountrySummary.domain == record["domain"],
                                        CountrySummary.date == record["date"],
                                        CountrySummary.country == record["country"]
                                    ).first()

                                    if existing:
                                        # Обновляем существующую запись
                                        existing.traffic_clicks = record["traffic_clicks"]
                                        existing.impressions = record["impressions"]
                                        existing.ctr = record["ctr"]
                                        existing.avg_position = record["avg_position"]
                                    else:
                                        # Создаем новую запись
                                        summary = CountrySummary(
                                            domain=record["domain"],
                                            date=record["date"],
                                            country=record["country"],
                                            traffic_clicks=record["traffic_clicks"],
                                            impressions=record["impressions"],
                                            ctr=record["ctr"],
                                            avg_position=record["avg_position"]
                                        )
                                        db_local.add(summary)

                                db_local.commit()
                                logger.info(f"Saved country data for {domain} on {current_date}")
                            except Exception as e:
                                db_local.rollback()
                                update_status["errors"].append(f"Error saving country data for {domain} on {current_date}: {str(e)}")
                                logger.error(f"Error saving country data for {domain} on {current_date}: {e}")
                            finally:
                                db_local.close()
                        except Exception as e:
                            update_status["errors"].append(f"Error fetching country data for {domain} on {current_date}: {str(e)}")
                            logger.error(f"Error fetching country data for {domain} on {current_date}: {e}")

                    update_status["domains_processed"] += 1
                    update_status["progress"] = round((update_status["domains_processed"] / update_status["domains_total"]) * 100)
                    logger.info(f"Completed processing country data for domain {domain}, progress: {update_status['progress']}%")
                except Exception as e:
                    update_status["errors"].append(f"Error processing country data for domain {domain}: {str(e)}")
                    logger.error(f"Error processing country data for domain {domain}: {e}")
                    update_status["domains_processed"] += 1
                    update_status["progress"] = round((update_status["domains_processed"] / update_status["domains_total"]) * 100)

            update_status["status"] = "completed"
            logger.info("Data update process completed successfully")
        except Exception as e:
            update_status["status"] = "error"
            update_status["errors"].append(f"Global error: {str(e)}")
            logger.error(f"Global error during update: {e}")

    # Запускаем задачу в фоне
    background_tasks.add_task(update_data_background)

    # Возвращаем начальный статус
    return {"status": "started", "message": "Update process started in background"}

@app.get("/api/update_status")
async def get_update_status(username: str = Depends(get_current_username)):
    """Получить текущий статус обновления данных"""
    global update_status
    return update_status

# Новый маршрут для принудительной очистки кэша
@app.post("/api/clear_cache")
async def clear_server_cache(username: str = Depends(get_current_username)):
    """Очищает серверный кэш"""
    success = invalidate_cache("*")
    return {"success": success, "message": "Серверный кэш очищен"}

# Маршрут для проверки состояния API
@app.get("/api/health")
def health_check():
    """Проверка работоспособности API"""
    return {"status": "ok", "message": "API работает нормально"}

def daterange(start_date: date, end_date: date):
    """Генератор для перебора дат в диапазоне"""
    for n in range((end_date - start_date).days + 1):
        yield start_date + timedelta(n)

if __name__ == "__main__":
    import uvicorn

    logger.info("Starting GSC Stats API server")
    uvicorn.run(app, host="0.0.0.0", port=8000)
