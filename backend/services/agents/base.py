"""
Shared utilities for AI news agents.

Provides common functions for calling Claude API with and without web search,
and extracting JSON from responses.
"""

import json
import re

import anthropic


def call_claude_with_web_search(
    client: anthropic.Anthropic,
    model: str,
    prompt: str,
    max_tokens: int = 8000,
    max_uses: int = 10,
    allowed_domains: list[str] | None = None,
    blocked_domains: list[str] | None = None,
    timeout: float = 120.0,
) -> list:
    """
    Call Claude API with web search tool and handle the agentic loop.

    Args:
        client: Anthropic API client instance
        model: Model ID to use
        prompt: The prompt to send
        max_tokens: Maximum output tokens
        max_uses: Maximum number of web searches
        allowed_domains: Only search these domains (None = all)
        blocked_domains: Exclude these domains (None = none)
        timeout: Request timeout in seconds

    Returns:
        List of content blocks from Claude's response
    """
    messages = [{"role": "user", "content": prompt}]
    web_search_tool = {
        "type": "web_search_20250305",
        "name": "web_search",
        "max_uses": max_uses,
    }
    if allowed_domains:
        web_search_tool["allowed_domains"] = allowed_domains
    if blocked_domains:
        web_search_tool["blocked_domains"] = blocked_domains

    response = None
    for iteration in range(5):
        print(f"[Agent] API call {iteration + 1} (model={model})")

        with client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            tools=[web_search_tool],
            messages=messages,
            timeout=timeout,
        ) as stream:
            response = stream.get_final_message()

        if response.stop_reason == "end_turn":
            return response.content

        if response.stop_reason == "pause_turn":
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": "Continue."})
        else:
            return response.content

    return response.content if response else []


def call_claude(
    client: anthropic.Anthropic,
    model: str,
    system: str,
    user_message: str,
    max_tokens: int = 8000,
    timeout: float = 60.0,
) -> list:
    """
    Call Claude API without tools (simple message).

    Args:
        client: Anthropic API client instance
        model: Model ID to use
        system: System prompt
        user_message: User message content
        max_tokens: Maximum output tokens
        timeout: Request timeout in seconds

    Returns:
        List of content blocks from Claude's response
    """
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_message}],
        timeout=timeout,
    )
    return response.content


def extract_json(content_blocks: list) -> dict:
    """
    Extract and parse JSON from Claude's response content blocks.

    Handles code-fenced JSON, raw JSON objects, and JSON arrays.

    Args:
        content_blocks: List of content blocks from Claude

    Returns:
        Parsed JSON as a Python dict or list

    Raises:
        ValueError: If no valid JSON found in response
    """
    text = ""
    for block in content_blocks:
        if getattr(block, "type", None) == "text":
            text += block.text

    if not text:
        raise ValueError("No text content in response")

    # Try code block first
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return json.loads(match.group(1))

    # Try raw JSON object
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    # Try raw JSON array
    match = re.search(r"\[[\s\S]*\]", text)
    if match:
        return json.loads(match.group(0))

    raise ValueError("No JSON found in response")
