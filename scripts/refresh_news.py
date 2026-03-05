#!/usr/bin/env python3
"""
Cron News Refresh Script

Lightweight script designed to run as a Render Cron Job. Makes an
authenticated HTTP request to the Flask web service to trigger a
news refresh cycle.

Required environment variables:
    APP_URL      - Base URL of the web service (e.g. https://your-app.onrender.com)
    CRON_SECRET  - Shared secret matching the web service's CRON_SECRET

Usage:
    python scripts/refresh_news.py

Render Cron Job setup:
    Build command:  pip install requests
    Start command:  python scripts/refresh_news.py
    Schedule:       0 0 * * *  (daily at midnight UTC)
"""

import os
import sys

import requests

TIMEOUT_SECONDS = 300


def main():
    app_url = os.environ.get('APP_URL', '').rstrip('/')
    cron_secret = os.environ.get('CRON_SECRET', '')

    if not app_url:
        print('[Cron] ERROR: APP_URL environment variable is not set')
        sys.exit(1)

    if not cron_secret:
        print('[Cron] ERROR: CRON_SECRET environment variable is not set')
        sys.exit(1)

    endpoint = f'{app_url}/api/news/cron-refresh'
    print(f'[Cron] Requesting news refresh from {endpoint}')

    try:
        response = requests.post(
            endpoint,
            headers={'X-Cron-Secret': cron_secret},
            timeout=TIMEOUT_SECONDS,
        )

        data = response.json()

        if response.ok and data.get('success'):
            print(f'[Cron] Success: {data.get("message")}')
            print(f'[Cron] Stories: {data.get("storiesCount", 0)}, '
                  f'Papers: {data.get("papersCount", 0)}')
            sys.exit(0)
        else:
            print(f'[Cron] Failed (HTTP {response.status_code}): '
                  f'{data.get("error", "Unknown error")}')
            sys.exit(1)

    except requests.exceptions.Timeout:
        print(f'[Cron] ERROR: Request timed out after {TIMEOUT_SECONDS}s')
        sys.exit(1)
    except requests.exceptions.ConnectionError as e:
        print(f'[Cron] ERROR: Could not connect to {endpoint}: {e}')
        sys.exit(1)
    except Exception as e:
        print(f'[Cron] ERROR: Unexpected error: {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()
