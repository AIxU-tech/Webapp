/**
 * NewsPage Component
 *
 * Displays the latest AI news stories and research papers in a clean,
 * responsive layout. Content is fetched from Claude's web search and
 * cached for optimal performance.
 *
 * Features:
 * - Top 3 AI news stories from the past 24-48 hours
 * - Top 3 AI research papers from the past week
 * - Interactive AI chat for each story/paper
 * - Chat replaces summary view when conversation starts
 * - Source attribution visible in initial view
 * - Admin refresh button to fetch new content
 * - Auto-fetch when no content exists (first visit)
 *
 * @component
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  useAIContent,
  useRefreshAIContent,
  useStoryChatMutation,
  usePaperChatMutation
} from '../hooks/useNews';


// =============================================================================
// TEXT UTILITIES
// =============================================================================

/**
 * Strip citation tags from text.
 *
 * Removes Claude web search citation markers like <cite index="1-2,1-3">
 * and other formatting artifacts from the text content.
 *
 * @param {string} text - The text that may contain citation tags
 * @returns {string} Clean text without citation markers
 */
function stripCitations(text) {
  if (!text || typeof text !== 'string') return text;

  return text
    // Remove <cite index="..."> and </cite> tags
    .replace(/<cite[^>]*>/gi, '')
    .replace(/<\/cite>/gi, '')
    // Remove any other HTML-like tags that might slip through
    .replace(/<[^>]+>/g, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}


/**
 * Generate a UUID v4 for session identification.
 *
 * Creates a unique session ID for chat conversations.
 * Uses crypto.randomUUID if available, falls back to manual generation.
 *
 * @returns {string} A UUID v4 string
 */
function generateSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


// =============================================================================
// ICON COMPONENTS
// =============================================================================

/**
 * NewspaperIcon - Represents news stories section
 */
const NewspaperIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
    />
  </svg>
);


/**
 * AcademicCapIcon - Represents research papers section
 */
const AcademicCapIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 14l9-5-9-5-9 5 9 5z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 14v7"
    />
  </svg>
);


/**
 * ExternalLinkIcon - Indicates outbound links
 */
const ExternalLinkIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);


/**
 * RefreshIcon - For the refresh button
 */
const RefreshIcon = ({ spinning = false }) => (
  <svg
    className={`h-5 w-5 ${spinning ? 'animate-spin' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);


/**
 * ChatBubbleIcon - For the chat input area
 */
const ChatBubbleIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);


/**
 * SendIcon - For the send button in chat
 */
const SendIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
    />
  </svg>
);


/**
 * ArrowLeftIcon - For back button in chat mode
 */
const ArrowLeftIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
    />
  </svg>
);


/**
 * LoadingDotsIcon - Animated loading indicator for AI responses
 */
const LoadingDotsIcon = () => (
  <div className="flex items-center gap-1">
    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);


// =============================================================================
// CHAT MESSAGE COMPONENT
// =============================================================================

/**
 * Displays a single message in the chat interface with styling
 * based on whether it's from the user or the AI assistant.
 *
 * @param {Object} props
 * @param {string} props.role - 'user' or 'assistant'
 * @param {string} props.content - The message content
 */
function ChatMessage({ role, content }) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white'
            : 'bg-muted text-foreground'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}


// =============================================================================
// CHAT INTERFACE COMPONENT
// =============================================================================

/**
 * The main chat UI that replaces the summary view when a conversation starts.
 * Includes message history, input field, and send button.
 *
 * Features:
 * - Auto-scrolls to latest message
 * - Shows loading state while AI responds
 * - Handles Enter key for sending (Shift+Enter for new line)
 *
 * @param {Object} props
 * @param {Array} props.messages - Array of message objects {role, content}
 * @param {boolean} props.isLoading - Whether AI is currently responding
 * @param {Function} props.onSendMessage - Callback when user sends a message
 */
function ChatInterface({ messages, isLoading, onSendMessage }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Focus the input when the chat interface mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const trimmedInput = inputValue.trim();
      if (trimmedInput && !isLoading) {
        onSendMessage(trimmedInput);
        setInputValue('');
      }
    },
    [inputValue, isLoading, onSendMessage]
  );

  // Handle keyboard events - Enter sends, Shift+Enter adds new line
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex flex-col h-[400px]">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <ChatBubbleIcon />
            <p className="mt-2">Start a conversation about this story</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <ChatMessage key={index} role={msg.role} content={msg.content} />
        ))}

        {/* Loading indicator when AI is responding */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
              <LoadingDotsIcon />
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="pt-3 border-t border-border">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="flex-shrink-0 p-2.5 rounded-xl bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}


// =============================================================================
// NEWS CARD COMPONENT
// =============================================================================

/**
 * Displays a single AI news story with two view modes:
 * 1. Summary Mode (default): Shows title, summary, significance, and sources
 * 2. Chat Mode: Replaces summary with an interactive AI chat interface
 *
 * The card transitions to chat mode when the user sends their first message.
 *
 * @param {Object} props
 * @param {Object} props.story - The news story data
 * @param {number} props.rank - Display rank (1, 2, or 3)
 */
function NewsCard({ story, rank }) {
  const [isChatMode, setIsChatMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [summaryInput, setSummaryInput] = useState('');

  // Chat mutation hook for sending messages
  const chatMutation = useStoryChatMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, I encountered an error: ${error.message || 'Please try again.'}` }
      ]);
    }
  });

  // Parse categories - handle both array and string formats
  const categories = Array.isArray(story.categories) ? story.categories : [];
  const cleanSummary = stripCitations(story.summary);

  // Handle sending a message from the chat interface
  const handleSendMessage = useCallback(
    (message) => {
      setMessages((prev) => [...prev, { role: 'user', content: message }]);
      chatMutation.mutate({ storyId: story.id, message, sessionId });
    },
    [chatMutation, story.id, sessionId]
  );

  // Handle starting a chat from the summary view
  const handleStartChat = useCallback(
    (e) => {
      e.preventDefault();
      const message = summaryInput.trim();
      if (message) {
        const newSessionId = generateSessionId();
        setSessionId(newSessionId);
        setMessages([{ role: 'user', content: message }]);
        setIsChatMode(true);
        setSummaryInput('');
        chatMutation.mutate({ storyId: story.id, message, sessionId: newSessionId });
      }
    },
    [summaryInput, chatMutation, story.id]
  );

  // Handle going back to summary view
  const handleBackToSummary = useCallback(() => {
    setIsChatMode(false);
  }, []);

  // Handle keyboard events for the summary input
  const handleSummaryInputKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleStartChat(e);
      }
    },
    [handleStartChat]
  );

  return (
    <article className="bg-card border border-border rounded-lg overflow-hidden shadow-card hover:shadow-hover transition-all duration-200">
      <div className="p-5">
        {/* Card Header - Always visible */}
        <div className="flex items-start gap-4">
          {/* Rank Badge Column */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{rank}</span>
            </div>
            {isChatMode && (
              <button
                onClick={handleBackToSummary}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Back to summary"
              >
                <ArrowLeftIcon />
              </button>
            )}
          </div>

          {/* Title and Categories */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground leading-snug mb-2">
              {stripCitations(story.title)}
            </h3>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {categories.map((category, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conditional Content: Summary Mode vs Chat Mode */}
        {!isChatMode ? (
          // Summary Mode
          <div className="mt-4">
            <p className="text-muted-foreground text-sm leading-relaxed">{cleanSummary}</p>

            {/* Sources Section */}
            {story.sources && story.sources.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Sources</h4>
                <ul className="space-y-1.5">
                  {story.sources.map((source, idx) => (
                    <li key={idx}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 text-sm text-primary hover:text-primary/80 transition-colors group"
                      >
                        <ExternalLinkIcon className="h-4 w-4 mt-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                        <span className="font-medium">{source.sourceName || 'Source'}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Chat Input */}
            <form onSubmit={handleStartChat} className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ChatBubbleIcon />
                </div>
                <input
                  type="text"
                  value={summaryInput}
                  onChange={(e) => setSummaryInput(e.target.value)}
                  onKeyDown={handleSummaryInputKeyDown}
                  placeholder="Ask AI about this story..."
                  className="flex-1 bg-transparent border-none text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!summaryInput.trim() || chatMutation.isPending}
                  className="p-2 rounded-lg bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  aria-label="Start chat"
                >
                  <SendIcon />
                </button>
              </div>
            </form>
          </div>
        ) : (
          // Chat Mode
          <div className="mt-4">
            <ChatInterface
              messages={messages}
              isLoading={chatMutation.isPending}
              onSendMessage={handleSendMessage}
            />
          </div>
        )}
      </div>
    </article>
  );
}


// =============================================================================
// RESEARCH PAPER CARD COMPONENT
// =============================================================================

/**
 * Displays a single research paper with two view modes:
 * 1. Summary Mode (default): Shows title, authors, summary, key findings
 * 2. Chat Mode: Replaces summary with an interactive AI chat interface
 *
 * @param {Object} props
 * @param {Object} props.paper - The research paper data
 * @param {number} props.rank - Display rank (1, 2, or 3)
 */
function ResearchCard({ paper, rank }) {
  const [isChatMode, setIsChatMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [summaryInput, setSummaryInput] = useState('');

  // Chat mutation hook
  const chatMutation = usePaperChatMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, I encountered an error: ${error.message || 'Please try again.'}` }
      ]);
    }
  });

  const categories = Array.isArray(paper.categories) ? paper.categories : [];
  const cleanSummary = stripCitations(paper.summary);
  const cleanKeyFindings = stripCitations(paper.keyFindings);

  const handleSendMessage = useCallback(
    (message) => {
      setMessages((prev) => [...prev, { role: 'user', content: message }]);
      chatMutation.mutate({ paperId: paper.id, message, sessionId });
    },
    [chatMutation, paper.id, sessionId]
  );

  const handleStartChat = useCallback(
    (e) => {
      e.preventDefault();
      const message = summaryInput.trim();
      if (message) {
        const newSessionId = generateSessionId();
        setSessionId(newSessionId);
        setMessages([{ role: 'user', content: message }]);
        setIsChatMode(true);
        setSummaryInput('');
        chatMutation.mutate({ paperId: paper.id, message, sessionId: newSessionId });
      }
    },
    [summaryInput, chatMutation, paper.id]
  );

  const handleBackToSummary = useCallback(() => {
    setIsChatMode(false);
  }, []);

  const handleSummaryInputKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleStartChat(e);
      }
    },
    [handleStartChat]
  );

  return (
    <article className="bg-card border border-border rounded-lg overflow-hidden shadow-card hover:shadow-hover transition-all duration-200">
      <div className="p-5">
        {/* Card Header */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            {/* Different gradient for papers */}
            <div className="w-8 h-8 bg-gradient-to-br from-[hsl(280,85%,60%)] to-[hsl(320,85%,55%)] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{rank}</span>
            </div>
            {isChatMode && (
              <button
                onClick={handleBackToSummary}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Back to summary"
              >
                <ArrowLeftIcon />
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground leading-snug mb-1">
              {stripCitations(paper.title)}
            </h3>
            {paper.authors && (
              <p className="text-sm text-muted-foreground mb-2">{stripCitations(paper.authors)}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {paper.sourceName && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                  {paper.sourceName}
                </span>
              )}
              {categories.map((category, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </div>

        {!isChatMode ? (
          <div className="mt-4">
            <p className="text-muted-foreground text-sm leading-relaxed">{cleanSummary}</p>

            {cleanKeyFindings && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-foreground mb-1.5">Key Findings</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{cleanKeyFindings}</p>
              </div>
            )}

            {paper.paperUrl && (
              <div className="mt-4">
                <a
                  href={paper.paperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <span>Read Paper</span>
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            <form onSubmit={handleStartChat} className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ChatBubbleIcon />
                </div>
                <input
                  type="text"
                  value={summaryInput}
                  onChange={(e) => setSummaryInput(e.target.value)}
                  onKeyDown={handleSummaryInputKeyDown}
                  placeholder="Ask AI about this paper..."
                  className="flex-1 bg-transparent border-none text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!summaryInput.trim() || chatMutation.isPending}
                  className="p-2 rounded-lg bg-gradient-to-br from-[hsl(280,85%,60%)] to-[hsl(320,85%,55%)] text-white hover:shadow-lg hover:shadow-[hsl(280,85%,60%)]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  aria-label="Start chat"
                >
                  <SendIcon />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mt-4">
            <ChatInterface
              messages={messages}
              isLoading={chatMutation.isPending}
              onSendMessage={handleSendMessage}
            />
          </div>
        )}
      </div>
    </article>
  );
}


// =============================================================================
// SECTION HEADER COMPONENT
// =============================================================================

/**
 * Reusable header for news and research sections.
 */
function SectionHeader({ icon, title, subtitle, gradientFrom, gradientTo }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`w-10 h-10 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-xl flex items-center justify-center text-white`}
      >
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}


// =============================================================================
// LOADING SKELETON COMPONENT
// =============================================================================

/**
 * Loading placeholder for news/paper cards.
 */
function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 bg-muted rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
      </div>
    </div>
  );
}


/**
 * Displayed when content is being fetched for the first time.
 */
function InitialFetchLoading() {
  return (
    <div className="space-y-10">
      <section>
        <SectionHeader
          icon={<NewspaperIcon />}
          title="Top Stories"
          subtitle="AI news from the past 24-48 hours"
          gradientFrom="from-[hsl(220,85%,60%)]"
          gradientTo="to-[hsl(185,85%,55%)]"
        />
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex items-center gap-3 mb-4">
              <RefreshIcon spinning={true} />
              <span className="text-lg font-medium text-foreground">Stories loading...</span>
            </div>
            <p className="text-muted-foreground text-center max-w-md">
              Fetching the latest AI news from across the web. This may take a moment.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          icon={<AcademicCapIcon />}
          title="Research Papers"
          subtitle="Notable papers from the past week"
          gradientFrom="from-[hsl(280,85%,60%)]"
          gradientTo="to-[hsl(320,85%,55%)]"
        />
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex items-center gap-3 mb-4">
              <RefreshIcon spinning={true} />
              <span className="text-lg font-medium text-foreground">Papers loading...</span>
            </div>
            <p className="text-muted-foreground text-center max-w-md">
              Searching for notable AI research papers. This may take a moment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}


// =============================================================================
// MAIN NEWS PAGE COMPONENT
// =============================================================================

export default function NewsPage() {
  const { user } = useAuth();
  const isAdmin = user?.permission_level > 0;

  // Track if we've already triggered an auto-fetch
  const [hasTriggeredAutoFetch, setHasTriggeredAutoFetch] = useState(false);

  // Data Fetching - gets both stories and papers in one call
  const { data, isLoading, error, isFetching } = useAIContent();

  // Refresh Mutation - triggers Claude's web search
  const refreshMutation = useRefreshAIContent();

  const stories = data?.stories || [];
  const papers = data?.papers || [];
  const hasContent = stories.length > 0 || papers.length > 0;

  // Auto-fetch content when database is empty
  useEffect(() => {
    if (
      !isLoading &&
      !hasContent &&
      !hasTriggeredAutoFetch &&
      !refreshMutation.isPending &&
      !error
    ) {
      console.log('[NewsPage] No content found, triggering automatic fetch...');
      setHasTriggeredAutoFetch(true);
      refreshMutation.mutate();
    }
  }, [isLoading, hasContent, hasTriggeredAutoFetch, refreshMutation, error]);

  // Handle Refresh Button Click
  function handleRefresh() {
    refreshMutation.mutate(undefined, {
      onError: (err) => {
        console.error('Failed to refresh AI content:', err);
        alert(err.message || 'Failed to refresh content. Please try again.');
      }
    });
  }

  // Set Page Title
  useEffect(() => {
    document.title = 'AI News & Research - AIxU';
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AI News & Research</h1>
          <p className="text-muted-foreground text-lg">
            Stay updated with the latest developments in artificial intelligence
          </p>
        </div>

        {/* Refresh Button - Admin Only */}
        {isAdmin && hasContent && (
          <button
            onClick={handleRefresh}
            disabled={refreshMutation.isPending || isFetching}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <RefreshIcon spinning={refreshMutation.isPending} />
            <span>{refreshMutation.isPending ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}
      </div>

      {/* Refreshing Indicator */}
      {refreshMutation.isPending && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            Fetching the latest AI news and research papers... This may take a moment.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted rounded-xl animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-3 bg-muted rounded w-40 animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted rounded-xl animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                <div className="h-3 bg-muted rounded w-44 animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </section>
        </div>
      )}

      {/* Error State */}
      {error && !hasContent && (
        <div className="text-center py-12">
          <div className="inline-block p-4 bg-destructive/10 rounded-full mb-4">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Unable to Load Content</h3>
          <p className="text-muted-foreground mb-4">
            {error.message || 'Something went wrong. Please try again later.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State / Initial Fetch Loading */}
      {!isLoading && !error && !hasContent && (
        refreshMutation.isPending ? (
          <InitialFetchLoading />
        ) : (
          <div className="text-center py-16">
            <div className="inline-block p-4 bg-muted/30 rounded-full mb-4">
              <NewspaperIcon />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Unable to Load Content</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We couldn't fetch AI news at this time. Please try again.
            </p>
            <button
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-6 py-2.5 rounded-lg font-medium hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshIcon spinning={refreshMutation.isPending} />
              <span>Try Again</span>
            </button>
          </div>
        )
      )}

      {/* Main Content */}
      {!isLoading && hasContent && (
        <div className="space-y-10">
          {/* News Stories Section */}
          <section>
            <SectionHeader
              icon={<NewspaperIcon />}
              title="Top Stories"
              subtitle="AI news from the past 24-48 hours"
              gradientFrom="from-[hsl(220,85%,60%)]"
              gradientTo="to-[hsl(185,85%,55%)]"
            />

            {stories.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {stories.map((story, index) => (
                  <NewsCard key={story.id || index} story={story} rank={index + 1} />
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No news stories available at the moment.</p>
              </div>
            )}
          </section>

          {/* Research Papers Section */}
          <section>
            <SectionHeader
              icon={<AcademicCapIcon />}
              title="Research Papers"
              subtitle="Notable papers from the past week"
              gradientFrom="from-[hsl(280,85%,60%)]"
              gradientTo="to-[hsl(320,85%,55%)]"
            />

            {papers.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {papers.map((paper, index) => (
                  <ResearchCard key={paper.id || index} paper={paper} rank={index + 1} />
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No research papers available at the moment.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
