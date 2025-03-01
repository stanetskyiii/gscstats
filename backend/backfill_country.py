# backfill_country.py
"""
Скрипт для первичной загрузки исторических данных по странам в отдельную базу.
Период: с 01.01.2024 по текущую дату (с учетом задержки GSC).
Запросы выполняются параллельно (до 20 потоков) с логированием и прогресс-баром.
Использует функцию fetch_country_data_for_domain из gsc_client.py.
"""

import time
import logging
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from config import DOMAINS
from country_database import SessionLocal, engine, Base
from country_models import CountrySummary
from gsc_client import fetch_country_data_for_domain
from tqdm import tqdm

# Создаем таблицы в базе, если их еще нет
Base.metadata.create_all(bind=engine)

MAX_WORKERS = 20

def daterange(start_date: date, end_date: date):
    for n in range((end_date - start_date).days + 1):
        yield start_date + timedelta(n)

def process_country_data(domain: str, single_date: date):
    records = fetch_country_data_for_domain(domain, single_date)
    db = SessionLocal()
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
    return f"{domain} on {single_date} processed with {len(records)} records"

def backfill_country_data(start_date: date, end_date: date):
    total_tasks = sum(1 for _ in daterange(start_date, end_date)) * len(DOMAINS)
    print(f"Запущено задач (страны): {total_tasks}")
    start_time = time.time()
    successes = 0
    errors = 0
    tasks = {}

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        for single_date in daterange(start_date, end_date):
            for domain in DOMAINS:
                future = executor.submit(process_country_data, domain, single_date)
                tasks[future] = (domain, single_date)
        for future in tqdm(as_completed(tasks), total=total_tasks, desc="Обработка задач (страны)", unit="task"):
            try:
                future.result()
                successes += 1
            except Exception as e:
                errors += 1
                domain, single_date = tasks[future]
                logging.error(f"Ошибка при обработке {domain} on {single_date}: {e}")
    total_time = time.time() - start_time
    print(f"\nСтрана. Завершено: {successes} задач успешно, {errors} ошибок. Общее время: {total_time:.2f} сек.")
    if successes > 0:
        print(f"Среднее время обработки одной задачи: {total_time / successes:.2f} сек.")

if __name__ == "__main__":
    start_date = date(2024, 1, 1)
    # Используем сегодняшнюю дату минус 2 дня (учитывая задержку GSC)
    end_date = date.today() - timedelta(days=2)
    backfill_country_data(start_date, end_date)
