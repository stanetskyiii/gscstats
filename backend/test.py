# test_combined.py

import os
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

# Области доступа для чтения данных GSC
SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']

# Пути к файлам с клиентскими данными и токеном
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
    response = service.searchanalytics().query(
        siteUrl=site_url,
        body=request_body
    ).execute()
    return response

def fetch_indexing_data_for_domain(site_url: str, target_date: str):
    """
    **Пример/Симуляция:** Возвращает данные панели индексации, как они могут быть представлены в GSC.
    В реальном сценарии эта функция должна получать актуальные данные о покрытии (coverage), 
    суммарном количестве проиндексированных страниц и списке ошибок.
    """
    # Здесь возвращаем симулированный ответ, аналогичный тому, что вы видели ранее.
    simulated_response = {
        "pages_indexed": 333,
        "pages_not_indexed": 26,
        "errors": {
            "movedPermanently": 2,
            "temporaryRedirect": 0,
            "invalidParameter": 4,
            "invalidQuery": 2,
            "quotaExceeded": 1,
            "rateLimitExceeded": 2,
            "internalError": 1,
            "notFound": 5,
            "requestEntityTooLarge": 0
        }
    }
    return simulated_response

def main():
    # Укажите свойство, как оно настроено в GSC.
    # Если у вас нет прав на доменное свойство, используйте URL-свойство, например: "https://alvadi.jp/"
    site_url = "https://alvadi.jp/"
    target_date = "2025-01-31"
    
    # --- Данные панели эффективности (Performance)
    print("=== Данные панели Эффективности (Performance) ===")
    performance_data = fetch_performance_data_for_domain(site_url, target_date, target_date)
    if "rows" in performance_data:
        for row in performance_data["rows"]:
            date_str = row["keys"][0] if row.get("keys") else "N/A"
            print(f"Дата: {date_str}")
            print(f"  Клики: {row['clicks']}")
            print(f"  Показы: {row['impressions']}")
            print(f"  CTR: {row['ctr']:.2%}")
            print(f"  Средняя позиция: {row['position']:.2f}")
    else:
        print("Нет данных для панели Эффективности:")
        print(performance_data)
    
    # --- Данные панели индексации
    print("\n=== Данные панели Индексации ===")
    indexing_data = fetch_indexing_data_for_domain(site_url, target_date)
    print(f"Страниц проиндексировано: {indexing_data.get('pages_indexed')}")
    print(f"Страниц не проиндексировано: {indexing_data.get('pages_not_indexed')}")
    print("Ошибки индексации:")
    errors = indexing_data.get("errors", {})
    if errors:
        for error_type, count in errors.items():
            print(f"  {error_type}: {count}")
    else:
        print("  Нет ошибок")

if __name__ == "__main__":
    main()
