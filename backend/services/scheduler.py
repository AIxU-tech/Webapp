"""
News Refresh Service

Provides a reusable helper for refreshing AI news content and cleaning up
old batches. Used by the cron refresh API endpoint and available for any
other caller that needs to trigger a full news refresh cycle.
"""

from datetime import datetime, timezone

from backend.services.ai_news import fetch_top_ai_content, cleanup_old_batches

DEFAULT_KEEP_BATCHES = 7


def refresh_news(keep_batches=DEFAULT_KEEP_BATCHES):
    """
    Run a full news refresh cycle: fetch new content, then clean up old batches.

    Args:
        keep_batches: Number of recent batches to retain (default 7).

    Returns:
        dict with at least 'success' (bool). On success, includes 'message',
        'batch_id', 'stories_count', 'papers_count', etc. On failure,
        includes 'error'.
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"[News Refresh] Starting news refresh at {timestamp}")

    try:
        result = fetch_top_ai_content()

        if result.get('success'):
            print(f"[News Refresh] Success: {result.get('message')}")
            deleted = cleanup_old_batches(keep_count=keep_batches)
            if deleted > 0:
                print(f"[News Refresh] Cleaned up {deleted} old batches")
        else:
            print(f"[News Refresh] Failed: {result.get('error')}")

        return result

    except Exception as e:
        print(f"[News Refresh] Error: {e}")
        return {'success': False, 'error': str(e)}
