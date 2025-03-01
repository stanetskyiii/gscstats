# cron_job.py
"""
Планировщик, который запускается дважды в день (в 00:00 и 12:00) и обновляет недостающие данные:
1. Для доменных данных – обновляет данные по каждому домену в основной БД.
2. Для данных по странам – обновляет данные по каждому домену в базе данных стран.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import time, logging
from database import SessionLocal, engine, Base
from models import DomainSummary
from gsc_client import fetch_gsc_data_for_domain
from config import DOMAINS

from country_database import SessionLocal as CountrySessionLocal, engine as CountryEngine, Base as CountryBase
from country_models import CountrySummary
from gsc_client import fetch_country_data_for_domain

from tqdm import tqdm

MAX_WORKERS = 20

def daterange(start_date: date, end_date: date):
    for n in range((end_date - start_date).days + 1):
        yield start_date + timedelta(n)

# --- Обновление доменных данных ---
def update_missing_domain_data():
    today = date.today()
    # Данные доступны с задержкой 2 дня
    available_date = today - timedelta(days=2)
    db = SessionLocal()
    domains_to_update = {}
    for domain in DOMAINS:
        last_entry = db.query(DomainSummary).filter(DomainSummary.domain == domain).order_by(DomainSummary.date.desc()).first()
        if last_entry:
            last_date = last_entry.date
        else:
            last_date = date(2024, 1, 1) - timedelta(days=1)
        if last_date < available_date:
            start_date = last_date + timedelta(days=1)
            domains_to_update[domain] = (start_date, available_date)
        else:
            logging.info(f"{domain}: данные обновлены до {last_date}")
    db.close()
    
    total_tasks = sum(1 for _ in (d for d in daterange(*next(iter(domains_to_update.values()), (available_date, available_date))))) * len(domains_to_update) if domains_to_update else 0
    if total_tasks == 0:
        logging.info("Доменные данные актуальны.")
        return
    
    tasks = {}
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        for domain, (start_date, end_date) in domains_to_update.items():
            for single_date in daterange(start_date, end_date):
                future = executor.submit(process_domain_update, domain, single_date)
                tasks[future] = (domain, single_date)
        for future in tqdm(as_completed(tasks), total=len(tasks), desc="Обновление доменных данных", unit="task"):
            try:
                future.result()
            except Exception as e:
                domain, single_date = tasks[future]
                logging.error(f"Ошибка обновления {domain} on {single_date}: {e}")
    elapsed = time.time() - start_time
    logging.info(f"Обновление доменных данных завершено за {elapsed:.2f} сек.")

def process_domain_update(domain: str, single_date: date):
    data = fetch_gsc_data_for_domain(domain, single_date)
    db = SessionLocal()
    try:
        summary = DomainSummary(
            domain=domain,
            date=single_date,
            traffic_clicks=data.get("traffic_clicks", 0),
            impressions=data.get("impressions", 0),
            ctr=data.get("ctr", 0.0),
            avg_position=data.get("avg_position", 0.0),
            pages_indexed=data.get("pages_indexed", 0),
            pages_not_indexed=data.get("pages_not_indexed", 0)
        )
        db.add(summary)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
    return

# --- Обновление данных по странам ---
def update_missing_country_data():
    today = date.today()
    available_date = today - timedelta(days=2)
    db = CountrySessionLocal()
    domains_to_update = {}
    for domain in DOMAINS:
        last_entry = db.query(CountrySummary).filter(CountrySummary.domain == domain).order_by(CountrySummary.date.desc()).first()
        if last_entry:
            last_date = last_entry.date
        else:
            last_date = date(2024, 1, 1) - timedelta(days=1)
        if last_date < available_date:
            start_date = last_date + timedelta(days=1)
            domains_to_update[domain] = (start_date, available_date)
        else:
            logging.info(f"{domain} (страны): данные обновлены до {last_date}")
    db.close()
    
    total_tasks = sum(1 for _ in (d for d in daterange(*next(iter(domains_to_update.values()), (available_date, available_date))))) * len(domains_to_update) if domains_to_update else 0
    if total_tasks == 0:
        logging.info("Данные по странам актуальны.")
        return
    
    tasks = {}
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        for domain, (start_date, end_date) in domains_to_update.items():
            for single_date in daterange(start_date, end_date):
                future = executor.submit(process_country_update, domain, single_date)
                tasks[future] = (domain, single_date)
        for future in tqdm(as_completed(tasks), total=len(tasks), desc="Обновление данных по странам", unit="task"):
            try:
                future.result()
            except Exception as e:
                domain, single_date = tasks[future]
                logging.error(f"Ошибка обновления по странам {domain} on {single_date}: {e}")
    elapsed = time.time() - start_time
    logging.info(f"Обновление данных по странам завершено за {elapsed:.2f} сек.")

def process_country_update(domain: str, single_date: date):
    records = fetch_country_data_for_domain(domain, single_date)
    db = CountrySessionLocal()
    try:
        for record in records:
            summary = CountrySummary(
                domain=record["domain"],
                date=record["date"],
                country=record["country"],
                traffic_clicks=record["traffic_clicks"],
                impressions=record["impressions"],
                ctr=record["ctr"],
                avg_position=record["avg_position"]
            )
            db.add(summary)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
    return

def start_scheduler():
    """
    Запускает планировщик, который каждый день в 00:00 и 12:00 обновляет недостающие данные
    как для доменных данных, так и для данных по странам.
    """
    import pytz
    
    scheduler = BackgroundScheduler(timezone=pytz.UTC)
    # Планируем обновление в 00:00 и 12:00 по серверному времени
    scheduler.add_job(update_missing_domain_data, 'cron', hour='0,12', minute=0)
    scheduler.add_job(update_missing_country_data, 'cron', hour='0,12', minute=0)
    scheduler.start()

if __name__ == "__main__":
    start_scheduler()
    # Чтобы планировщик работал, удерживаем основной поток
    import time
    while True:
        time.sleep(60)
