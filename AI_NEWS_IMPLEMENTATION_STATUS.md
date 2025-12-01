# AI News Feature - Implementation Status & Issues

## Goal
Fetch top 10 AI news stories from the past 24 hours using Claude's web search API, with 2-3 sources per story.

---

## Current Architecture

### Files Created

1. **`backend/models/ai_news.py`** - Database models
   - `AINewsStory`: title, summary, significance, rank, categories, batch_id, fetched_at, event_date
   - `AINewsSource`: url, source_name, article_title, excerpt (FK to story)

2. **`backend/services/ai_news.py`** - Core fetch logic
   - `fetch_top_ai_stories()`: Calls Claude API with web search, stores results
   - `get_latest_stories()`: Returns cached stories from DB
   - Helper functions for batch management and cleanup

3. **`backend/routes/news.py`** - API endpoints
   - `GET /api/news` - Get latest stories (public)
   - `GET /api/news/<id>` - Get single story
   - `POST /api/news/refresh` - Trigger fetch (admin only)
   - `GET /api/news/batches` - View fetch history (admin)
   - `POST /api/news/cleanup` - Delete old batches (admin)

4. **Updated files**:
   - `backend/models/__init__.py` - Added model exports
   - `backend/routes/__init__.py` - Added news_bp export
   - `backend/__init__.py` - Registered news blueprint
   - `requirements.txt` - Added `anthropic>=0.40.0`
   - `.env` - Added `ANTHROPIC_API_KEY`

### Key Configuration Values (in `ai_news.py`)

```python
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"
MAX_TOKENS = 32000
NUM_STORIES = 3  # TODO: Increase to 10 for production
SOURCES_PER_STORY = 2  # TODO: Increase to 3 for production
max_uses = 10  # TODO: Increase to 20 for production
```

---

## Issue: Claude Returns Tool Blocks, Not Final JSON

### Symptom
When calling Claude with web search, the response contains:
- `TextBlock` with "I'll conduct a comprehensive search..."
- Multiple `ServerToolUseBlock` (web_search calls)
- `WebSearchToolResultBlock` (search results)
- **No final TextBlock with the synthesized JSON output**

### Error Message
```
ERROR: Could not find valid JSON in Claude response
```

### Raw Response Structure
```python
[
  TextBlock(text="I'll conduct a comprehensive search..."),
  ServerToolUseBlock(input={'query': 'AI news today December 2024'}),
  ServerToolUseBlock(input={'query': 'OpenAI announcement today'}),
  ServerToolUseBlock(input={'query': 'Google AI Gemini news today'}),
  WebSearchToolResultBlock(content=[...encrypted results...]),
  # Missing: Final TextBlock with JSON synthesis
]
```

### Stop Reason
`stop_reason = "end_turn"` but no final text synthesis.

---

## Hypotheses

### H1: max_uses Too Low
Claude hits the search limit before synthesizing results. Even with `max_uses=10`, Claude may be using all searches upfront without reserving capacity for synthesis.

**Evidence**: Simple test with 2 searches + small request worked and returned JSON.

**Fix**: Increase `max_uses` OR reduce scope of request OR restructure prompt to search less.

### H2: Prompt Too Complex
The detailed prompt (~1500 chars) with 10 stories × 3 sources × detailed fields may cause Claude to prioritize searching over synthesizing within token/time limits.

**Fix**: Simplify prompt, reduce output requirements, or split into multiple calls.

### H3: Streaming Agentic Loop Issue
The current implementation uses streaming but may not be correctly handling the multi-turn conversation when Claude needs to continue after tool results.

**Current Flow**:
1. Send initial message
2. Stream response → get final message
3. If `stop_reason == "tool_use"`: append assistant content + tool results to messages
4. Loop back to step 2

**Potential Issue**: The web_search tool is "server-managed" - results come back automatically in `WebSearchToolResultBlock`. We may not need to manually continue the conversation for server tools.

**Fix**: Check Anthropic docs for proper handling of server-managed tools vs client-side tools.

### H4: API Version/Tool Syntax
The tool definition `{"type": "web_search_20250305", ...}` may be outdated or incorrect.

**Fix**: Verify current Anthropic API documentation for web search tool syntax.

---

## What Works

1. Simple test request with 1-2 searches returns proper JSON:
```python
prompt = "Search for one AI news item and return JSON: {title, summary}"
# Returns: TextBlock with valid JSON after WebSearchToolResultBlock
```

2. Routes are correctly registered:
```
/api/news
/api/news/<int:story_id>
/api/news/refresh
/api/news/batches
/api/news/cleanup
```

3. Database models created and tables exist.

---

## Next Steps

1. **Test with much simpler prompt** - Request just 1 story, 1 source, minimal fields
2. **Check Anthropic docs** for web_search tool behavior with streaming
3. **Add logging** to see all content blocks and stop reasons
4. **Consider alternative**: Use Claude to analyze pre-fetched news (via Tavily/Perplexity API) instead of Claude's native web search

---

## Environment

- Python with Flask backend
- Anthropic SDK v0.75.0 (installed)
- Model: claude-sonnet-4-5-20250929
- Rate limit: 30,000 input tokens/minute (hit multiple times during testing)
