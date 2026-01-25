"""
Image Extraction Service

This module provides utilities for extracting representative images from web pages
using Open Graph and Twitter Card meta tags. These tags are specifically designed
by publishers to indicate the main image for social sharing.

Key Functions:
- extract_image_from_url(): Extract og:image from a single URL
- extract_image_for_story(): Try multiple source URLs to find an image
- extract_image_for_paper(): Extract image from a paper URL

The extraction follows this priority order:
1. og:image (Open Graph - Facebook, LinkedIn)
2. twitter:image (Twitter Cards)
3. twitter:image:src (Alternative Twitter format)
4. article:image (Some news sites)
"""

from typing import Optional

import requests
from bs4 import BeautifulSoup


# =============================================================================
# Configuration
# =============================================================================

# Request timeout in seconds
FETCH_TIMEOUT = 10

# User agent string for requests
USER_AGENT = 'Mozilla/5.0 (compatible; AIxU/1.0; +https://aixu.app)'


# =============================================================================
# Core Extraction Function
# =============================================================================

def extract_image_from_url(url: str) -> Optional[str]:
    """
    Extract the main image URL from a web page using Open Graph meta tags.

    Attempts to find the representative image in this order:
    1. og:image (Open Graph - used by Facebook, LinkedIn)
    2. twitter:image (Twitter Cards)
    3. twitter:image:src (Alternative Twitter format)
    4. article:image (Some news sites)

    Args:
        url: The URL of the web page to extract image from

    Returns:
        The image URL if found, None otherwise

    Example:
        >>> image = extract_image_from_url("https://techcrunch.com/article/...")
        >>> print(image)
        "https://techcrunch.com/wp-content/uploads/hero.jpg"
    """
    if not url:
        return None

    try:
        headers = {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml',
        }

        response = requests.get(
            url,
            headers=headers,
            timeout=FETCH_TIMEOUT,
            allow_redirects=True
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Try og:image first (most common and reliable)
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            image_url = og_image['content'].strip()
            if image_url:
                print(f"[ImageExtract] Found og:image for {url[:50]}...")
                return image_url

        # Try twitter:image
        twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
        if twitter_image and twitter_image.get('content'):
            image_url = twitter_image['content'].strip()
            if image_url:
                print(f"[ImageExtract] Found twitter:image for {url[:50]}...")
                return image_url

        # Try twitter:image:src (alternative format)
        twitter_image_src = soup.find('meta', attrs={'name': 'twitter:image:src'})
        if twitter_image_src and twitter_image_src.get('content'):
            image_url = twitter_image_src['content'].strip()
            if image_url:
                print(f"[ImageExtract] Found twitter:image:src for {url[:50]}...")
                return image_url

        # Try article:image (less common)
        article_image = soup.find('meta', property='article:image')
        if article_image and article_image.get('content'):
            image_url = article_image['content'].strip()
            if image_url:
                print(f"[ImageExtract] Found article:image for {url[:50]}...")
                return image_url

        print(f"[ImageExtract] No meta image found for {url[:50]}...")
        return None

    except requests.Timeout:
        print(f"[ImageExtract] Timeout fetching {url[:50]}...")
        return None
    except requests.RequestException as e:
        print(f"[ImageExtract] Request error for {url[:50]}...: {e}")
        return None
    except Exception as e:
        print(f"[ImageExtract] Error extracting from {url[:50]}...: {e}")
        return None


# =============================================================================
# Convenience Functions
# =============================================================================

def extract_image_for_story(sources: list) -> Optional[str]:
    """
    Extract an image URL from a news story's sources.

    Tries each source URL in order until an image is found.
    This is useful because news stories often have multiple sources,
    and we want to find any available image.

    Args:
        sources: List of source dictionaries with 'url' keys

    Returns:
        The first image URL found, or None if no images found

    Example:
        >>> sources = [
        ...     {"url": "https://techcrunch.com/...", "sourceName": "TechCrunch"},
        ...     {"url": "https://wired.com/...", "sourceName": "Wired"}
        ... ]
        >>> image = extract_image_for_story(sources)
    """
    if not sources:
        return None

    for source in sources:
        url = source.get('url')
        if url:
            image_url = extract_image_from_url(url)
            if image_url:
                return image_url

    return None


def extract_image_for_paper(paper_url: str) -> Optional[str]:
    """
    Extract an image URL from a research paper's page.

    Note: arXiv and many paper repositories don't have og:image tags,
    so this will often return None for papers. That's expected behavior -
    the frontend should handle missing images gracefully with a fallback.

    Args:
        paper_url: The URL of the paper (e.g., arXiv abstract page)

    Returns:
        The image URL if found, None otherwise

    Example:
        >>> image = extract_image_for_paper("https://arxiv.org/abs/2301.00001")
        >>> # Likely returns None since arXiv doesn't use og:image
    """
    return extract_image_from_url(paper_url)

