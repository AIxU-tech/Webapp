#!/usr/bin/env python3
"""
Set a user's permission level to ADMIN in the database.

Usage:
    python scripts/set_admin.py

Requires DATABASE_URL environment variable to be set.
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import psycopg2

EMAIL = 'brynn.creer@colorado.edu'
ADMIN_LEVEL = 1  # ADMIN permission level


def main():
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    print(f"Connecting to database...")

    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()

        # Check current permission level
        cur.execute(
            'SELECT id, email, permission_level FROM "user" WHERE email = %s',
            (EMAIL,)
        )
        row = cur.fetchone()

        if not row:
            print(f"ERROR: User with email '{EMAIL}' not found")
            sys.exit(1)

        user_id, email, current_level = row
        print(f"Found user: id={user_id}, email={email}, permission_level={current_level}")

        if current_level >= ADMIN_LEVEL:
            print(f"User is already an admin (permission_level={current_level})")
        else:
            # Update to admin
            cur.execute(
                'UPDATE "user" SET permission_level = %s WHERE email = %s',
                (ADMIN_LEVEL, EMAIL)
            )
            conn.commit()
            print(f"SUCCESS: Updated permission_level from {current_level} to {ADMIN_LEVEL}")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
