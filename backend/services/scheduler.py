"""
Background Task Scheduler Service

This module provides scheduled background tasks using APScheduler.
Currently schedules:
- AI news refresh every 24 hours

The scheduler uses BackgroundScheduler which runs in a separate thread,
compatible with Flask-SocketIO's eventlet/threading modes.

Usage:
    The scheduler is automatically started when the Flask app is created.
    Jobs run in the background without blocking the main application.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timezone

# Global scheduler instance
_scheduler = None


def _refresh_news_job(app):
    """
    Background job to refresh AI news content.

    This job runs within Flask's application context to access
    the database and other Flask extensions.

    Args:
        app: Flask application instance for context
    """
    with app.app_context():
        from backend.services.ai_news import fetch_top_ai_content, cleanup_old_batches

        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        print(f"[Scheduler] Starting scheduled news refresh at {timestamp}")

        try:
            result = fetch_top_ai_content()

            if result.get('success'):
                print(f"[Scheduler] News refresh successful: {result.get('message')}")
                # Clean up old batches to manage database size (keep last 7 days)
                deleted = cleanup_old_batches(keep_count=7)
                if deleted > 0:
                    print(f"[Scheduler] Cleaned up {deleted} old batches")
            else:
                print(f"[Scheduler] News refresh failed: {result.get('error')}")

        except Exception as e:
            print(f"[Scheduler] Error during scheduled news refresh: {e}")


def init_scheduler(app):
    """
    Initialize and start the background task scheduler.

    Sets up scheduled jobs for:
    - AI news refresh: Runs every 24 hours

    The scheduler only starts if not already running (safe for app reloads).

    Args:
        app: Flask application instance

    Returns:
        BackgroundScheduler instance
    """
    global _scheduler

    # Avoid starting multiple schedulers (important for debug mode with reloader)
    if _scheduler is not None and _scheduler.running:
        print("[Scheduler] Scheduler already running, skipping initialization")
        return _scheduler

    _scheduler = BackgroundScheduler(daemon=True)

    # Schedule news refresh every 24 hours
    # Using IntervalTrigger so it runs immediately on startup, then every 24h
    _scheduler.add_job(
        func=lambda: _refresh_news_job(app),
        trigger=IntervalTrigger(hours=24),
        id='news_refresh',
        name='Refresh AI News Content',
        replace_existing=True,
        max_instances=1,  # Prevent overlapping runs
        coalesce=True,    # Combine missed runs into one
    )

    _scheduler.start()

    next_run = _scheduler.get_job('news_refresh').next_run_time
    print(f"[Scheduler] Started background scheduler")
    print(f"[Scheduler] News refresh scheduled - next run: {next_run}")

    return _scheduler


def shutdown_scheduler():
    """
    Gracefully shut down the scheduler.

    Should be called when the application is shutting down to ensure
    all background jobs complete cleanly.
    """
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        print("[Scheduler] Shutting down scheduler...")
        _scheduler.shutdown(wait=False)
        _scheduler = None
        print("[Scheduler] Scheduler stopped")


def get_scheduler_status() -> dict:
    """
    Get the current status of the scheduler and its jobs.

    Returns:
        Dictionary with scheduler status information
    """
    global _scheduler

    if _scheduler is None:
        return {'running': False, 'jobs': []}

    jobs = []
    for job in _scheduler.get_jobs():
        jobs.append({
            'id': job.id,
            'name': job.name,
            'next_run': job.next_run_time.isoformat() if job.next_run_time else None,
            'trigger': str(job.trigger)
        })

    return {
        'running': _scheduler.running,
        'jobs': jobs
    }


def trigger_news_refresh_now(app):
    """
    Manually trigger an immediate news refresh.

    Useful for testing or admin-initiated refreshes outside the schedule.

    Args:
        app: Flask application instance
    """
    print("[Scheduler] Manual news refresh triggered")
    _refresh_news_job(app)
