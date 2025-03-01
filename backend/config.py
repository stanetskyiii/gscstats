# config.py
import json

COUNTRY_DATABASE_URL = "postgresql://postgres:NomkxQCfuGdaNZPyohfykQaEnNjWuIYh@switchback.proxy.rlwy.net:57225/railway"

# --- PostgreSQL ---
DATABASE_URL = "postgresql://postgres:NomkxQCfuGdaNZPyohfykQaEnNjWuIYh@switchback.proxy.rlwy.net:57225/railway"

# --- Google Search Console Credentials ---
GSC_CREDENTIALS = {
    "token": "ya29.a0AXeO80TjjtWsi3amMzAhbvc1EOf66p64Tw6_54xnc1bniqeKknZ6QYg7k1LqG0_UStQmpSk9iL5lREpKEYCUwG2jJ7HDjJ94jAJMzUqFWjK7zgIYPyk7KLvCd3gC7zQVjSKEruLrCyO9k0xQn94T6w9lKL0uduAjZhv91_XHQ9caCgYKAcASARASFQHGX2MibmCbICPhoTqs--istUme2A0178",
    "refresh_token": "1//0csiQ3_bVN0HrCgYIARAAGAwSNwF-L9IrknY7Ix4bwy9CrMNuX-pt5q8Ec8OPKZWPOi-GE-R7CFjqBhWVSJOYLW7866atqVOUG-Y",
    "token_uri": "https://oauth2.googleapis.com/token",
    "client_id": "1042267823089-rkog0ee0sdherkhkdbokl9h2iu4g6ro9.apps.googleusercontent.com",
    "client_secret": "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",
    "scopes": ["https://www.googleapis.com/auth/webmasters.readonly"],
    "universe_domain": "googleapis.com",
    "account": "",
    "expiry": "2025-02-16T12:39:21.917517Z"
}

# --- Google API Secret Key ---
GSC_SECRET_KEY = {
    "installed": {
        "client_id": "1042267823089-rkog0ee0sdherkhkdbokl9h2iu4g6ro9.apps.googleusercontent.com",
        "project_id": "alvadi-1287",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_secret": "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",
        "redirect_uris": ["http://localhost"]
    }
}

# --- Telegram Bot ---
TELEGRAM_BOT_TOKEN = "8069306537:AAH5Cjdtk1ey6WYTsUc_TllZgVPYaONhF1o"
TELEGRAM_CHAT_ID = "your_chat_id_here"  # Замените на ваш chat_id

# --- Авторизация API ---
AUTH_USERNAME = "admin"
AUTH_PASSWORD = "admin_password"

# --- Список доменов ---
DOMAINS = [
    "alvadi.al", "alvadi.am", "alvadi.at", "alvadi.be", "alvadi.ba", "alvadi.bg",
    "alvadi.cn", "alvadi.hr", "alvadi.cy", "alvadi.cz", "alvadi.ee", "alvadi.pl",
    "alvadi.fi", "alvadi.fr", "alvadi.ge", "alvadi.de", "alvadiparts.gr", "alvadi.gl",
    "alvadi.hu", "alvadi.is", "alvadi.in", "alvadi.id", "alvadi.ie", "alvadi.co.il",
    "alvadi.it", "alvadi.jp", "alvadi.kz", "alvadi.kr", "alvadi.lv", "alvadi.lt",
    "alvadi.lu", "alvadi.mk", "alvadi.my", "alvadi.mt", "alvadi.md", "alvadi.me",
    "alvadiparts.nl", "alvadi.nz", "alvadi.no", "alvadi.pt", "alvadi.ro", "alvadi.rs",
    "alvadi.sk", "alvadi.si", "alvadi.es", "alvadi.se", "alvadi.ch", "alvadi.com.tr",
    "alvadi.co.uk", "alvadi.com", "alvadi.vn", "alvadi.eu"
]

# --- HTTPS для API ---
USE_HTTPS = False
