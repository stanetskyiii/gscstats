# gsc_client.py
import os
import logging
from datetime import date
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

# Настройка логирования
logger = logging.getLogger("gsc_stats")

# Области доступа для чтения данных GSC
SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']

# Пути к файлам с клиентскими данными и токеном – укажите корректные пути
CLIENT_SECRETS_FILE = r"C:\Users\Андрей\Desktop\GSCSTATS\backend\client_secret_1042267823089-rkog0ee0sdherkhkdbokl9h2iu4g6ro9.apps.googleusercontent.com.json"
TOKEN_FILE = r"C:\Users\Андрей\Desktop\GSCSTATS\backend\token.json"

def get_credentials():
    """
    Получает OAuth 2.0 учетные данные: пытается загрузить сохраненные, а если их нет или они устарели – запускает flow.
    """
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
    return creds

def get_gsc_service():
    """
    Создает объект сервиса Google Search Console (Search Analytics API) с использованием OAuth 2.0.
    """
    creds = get_credentials()
    service = build('searchconsole', 'v1', credentials=creds)
    return service

def fetch_performance_data_for_domain(site_url: str, start_date: str, end_date: str):
    """
    Запрашивает данные отчета "Эффективность" (Performance) из Google Search Console
    для указанного site_url за период от start_date до end_date (формат 'YYYY-MM-DD').
    """
    service = get_gsc_service()
    request_body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": ["date"],
        "searchType": "web",
        "rowLimit": 10000
    }
    
    try:
        response = service.searchanalytics().query(
            siteUrl=site_url,
            body=request_body
        ).execute()
        return response
    except Exception as e:
        logger.error(f"Error fetching performance data for {site_url} ({start_date} to {end_date}): {e}")
        return None

def fetch_country_data_for_domain(domain: str, target_date: date):
    """
    Получает данные "Эффективности" по странам для указанного домена и даты.
    Запрашивает отчет с измерениями ["date", "country"] и возвращает список записей,
    каждая из которых содержит: domain, date, country, клики, показы, CTR и среднюю позицию.
    """
    site_url = f"https://{domain}/"
    date_str = target_date.strftime("%Y-%m-%d")
    service = get_gsc_service()
    request_body = {
        "startDate": date_str,
        "endDate": date_str,
        "dimensions": ["date", "country"],
        "searchType": "web",
        "rowLimit": 10000
    }
    
    try:
        response = service.searchanalytics().query(
            siteUrl=site_url,
            body=request_body
        ).execute()
        records = []
        
        if "rows" in response:
            for row in response["rows"]:
                keys = row.get("keys", [])
                country = keys[1] if len(keys) > 1 else "N/A"
                record = {
                    "domain": domain,
                    "date": target_date,
                    "country": country,
                    "traffic_clicks": int(row.get("clicks", 0)),
                    "impressions": int(row.get("impressions", 0)),
                    "ctr": float(row.get("ctr", 0.0)),
                    "avg_position": float(row.get("position", 0.0))
                }
                records.append(record)
        return records
    except Exception as e:
        logger.error(f"Error fetching country data for {domain} on {date_str}: {e}")
        return None

def fetch_indexing_data_for_domain(site_url: str, target_date: str):
    """
    Поскольку Google не предоставляет публичного API для агрегированных данных индексации,
    эта функция возвращает значения по умолчанию.
    """
    return {
        "pages_indexed": 0,
        "pages_not_indexed": 0,
        "errors": {}
    }

def fetch_gsc_data_for_domain(domain: str, target_date: date):
    """
    Получает сводные данные для домена на указанную дату.
    Использует реальные данные для панели "Эффективность" (Performance):
      - Преобразует domain в URL (например, "https://alvadi.jp/")
      - Запрашивает данные за указанный день и извлекает клики, показы, CTR и среднюю позицию.
    Для панели индексации вызывается fetch_indexing_data_for_domain, которая возвращает значения по умолчанию.
    Возвращает словарь с данными для сохранения в БД или None, если данных нет.
    """
    site_url = f"https://{domain}/"
    date_str = target_date.strftime("%Y-%m-%d")
    
    try:
        performance_response = fetch_performance_data_for_domain(site_url, date_str, date_str)
        
        # Если ответ пустой или нет строк данных, значит данных за эту дату нет
        if not performance_response or "rows" not in performance_response or not performance_response["rows"]:
            logger.info(f"No data available for {domain} on {date_str}")
            return None
            
        traffic_clicks = 0
        impressions = 0
        ctr = 0.0
        avg_position = 0.0
        
        row = performance_response["rows"][0]
        traffic_clicks = row.get("clicks", 0)
        impressions = row.get("impressions", 0)
        ctr = row.get("ctr", 0.0)
        avg_position = row.get("position", 0.0)
            
        indexing_data = fetch_indexing_data_for_domain(site_url, date_str)
            
        result = {
            "traffic_clicks": int(traffic_clicks),
            "impressions": int(impressions),
            "ctr": float(ctr),
            "avg_position": float(avg_position),
            "pages_indexed": indexing_data.get("pages_indexed", 0),
            "pages_not_indexed": indexing_data.get("pages_not_indexed", 0),
            "errors": indexing_data.get("errors", {})
        }
            
        # Проверка на нулевые значения - если все нули, возможно данных нет
        if traffic_clicks == 0 and impressions == 0 and ctr == 0 and avg_position == 0:
            logger.info(f"All metrics are zero for {domain} on {date_str}, likely no data")
            
        return result
    except Exception as e:
        logger.error(f"Error fetching GSC data for {domain} on {date_str}: {e}")
        return None
