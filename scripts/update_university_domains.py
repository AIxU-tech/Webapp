#!/usr/bin/env python3
"""
Update University Email Domains Script

Updates the email_domain field for universities in the database.
Run with: python scripts/update_university_domains.py
"""

import sys
import os

# Add the project root to the path so we can import the app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from backend.extensions import db
from backend.models import University
from sqlalchemy import text


# Mapping of university name patterns to their .edu email domains
# These are the actual universities in the database
UNIVERSITY_DOMAINS = {
    'oregon': 'uoregon',           # user@uoregon.edu
    'michigan state': 'msu',        # user@msu.edu
    'university of michigan': 'umich',  # user@umich.edu
    'iowa': 'uiowa',               # user@uiowa.edu
    'colorado': 'colorado',         # user@colorado.edu
    'brigham young': 'byu',         # user@byu.edu
}


def find_domain(name):
    """Find matching email domain for a university name."""
    name_lower = name.lower()
    for pattern, domain in UNIVERSITY_DOMAINS.items():
        if pattern in name_lower:
            return domain
    return None


def add_column_if_not_exists():
    """Add email_domain column to universities table if it doesn't exist."""
    try:
        db.session.execute(text(
            "ALTER TABLE universities ADD COLUMN IF NOT EXISTS email_domain VARCHAR(100)"
        ))
        db.session.commit()
        print("✅ Ensured email_domain column exists")
    except Exception as e:
        print(f"Note: {e}")
        db.session.rollback()


def main():
    with app.app_context():
        # First, ensure the column exists
        add_column_if_not_exists()

        universities = University.query.order_by(University.name).all()

        print(f"\nFound {len(universities)} universities:\n")

        for uni in universities:
            domain = find_domain(uni.name)
            current = uni.email_domain or 'NOT SET'

            print(f"  {uni.name}")
            print(f"    Current: {current}")
            print(f"    New:     {domain or 'NO MATCH'}")

            if domain and not uni.email_domain:
                uni.email_domain = domain

        print("\nSaving changes...")
        db.session.commit()
        print("✅ Done!")


if __name__ == '__main__':
    main()
