"""
Скрипт для первичной загрузки исторических данных в базу.
Период: с 01.01.2024 по 25.02.2025.
Запросы по доменам выполняются параллельно (до 20 потоков) с подробным логированием и прогресс-баром.
Используется функция fetch_gsc_data_for_domain из gsc_client.py, которая получает реальные данные для панели "Эффективность"
(клики, показы, CTR, средняя позиция) и возвращает значения по умолчанию для панели индексации.
"""

import time
import logging
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from config import DOMAINS
from database import SessionLocal, engine, Base
from models import DomainSummary, DomainError
from gsc_client import fetch_gsc_data_for_domain
from tqdm import tqdm

# Создаем таблицы в базе, если их еще нет
Base.metadata.create_all(bind=engine)

MAX_WORKERS = 20

def daterange(start_date: date, end_date: date):
    for n in range((end_date - start_date).days + 1):
        yield start_date + timedelta(n)

def process_domain_date(domain: str, single_date: date):
    start = time.time()
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
        errors = data.get("errors", {})
        for error_type, count in errors.items():
            domain_error = DomainError(
                domain=domain,
                date=single_date,
                error_type=error_type,
                count=count
            )
            db.add(domain_error)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
    elapsed = time.time() - start
    return f"{domain} on {single_date} processed in {elapsed:.2f} sec"

def backfill_data(start_date: date, end_date: date):
    total_tasks = sum(1 for _ in daterange(start_date, end_date)) * len(DOMAINS)
    print(f"Запущено задач: {total_tasks}")
    start_time = time.time()
    successes = 0
    errors = 0
    tasks = {}

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        for single_date in daterange(start_date, end_date):
            for domain in DOMAINS:
                future = executor.submit(process_domain_date, domain, single_date)
                tasks[future] = (domain, single_date)
        for future in tqdm(as_completed(tasks), total=total_tasks, desc="Обработка задач", unit="task"):
            try:
                future.result()
                successes += 1
            except Exception as e:
                errors += 1
                domain, single_date = tasks[future]
                logging.error(f"Ошибка при обработке {domain} on {single_date}: {e}")

    total_time = time.time() - start_time
    print(f"\nЗавершено: {successes} задач успешно, {errors} ошибок. Общее время выполнения: {total_time:.2f} секунд.")
    if successes > 0:
        print(f"Среднее время обработки одной задачи: {total_time / successes:.2f} секунд.")

if __name__ == "__main__":
    start_date = date(2024, 1, 1)
    end_date = date(2025, 2, 25)
    backfill_data(start_date, end_date)
