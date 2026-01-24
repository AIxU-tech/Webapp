/**
 * ContentCard Component
 *
 * A unified card component for displaying AI news stories and research papers.
 * Both types share the same chat functionality and card structure, with
 * type-specific content sections.
 *
 * Features:
 * - Emoji badge with gradient background
 * - Hero image with fallback to emoji on gradient
 * - Summary mode with type-specific content (sources for news, findings for papers)
 * - Interactive AI chat that replaces summary when active
 * - Back button to return from chat to summary
 *
 * @component
 */

import { useState, useCallback, useRef } from 'react';
import { ExternalLinkIcon, ArrowLeftIcon, MessageCircleIcon, SendIcon, SparklesIcon } from '../icons';
import { useStoryChatMutation, usePaperChatMutation } from '../../hooks/useNews';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '../../contexts/AuthModalContext';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Strip citation tags from text.
 * Removes Claude web search citation markers and HTML tags.
 */
function stripCitations(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/<cite[^>]*>/gi, '')
    .replace(/<\/cite>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a UUID v4 for session identification.
 */
function generateSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format a date string to "Month YYYY" format
 */
function formatDateToMonthYear(dateString) {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

/**
 * Get the primary category from a categories array
 */
function getPrimaryCategory(categories) {
  if (!categories || categories.length === 0) return null;
  return categories[0];
}

/**
 * Get the primary link URL for an item
 * For stories: first source URL
 * For papers: paperUrl
 */
function getPrimaryUrl(item, type) {
  if (type === 'paper') {
    return item.paperUrl || null;
  }
  // For stories, use first source URL
  if (item.sources && item.sources.length > 0) {
    return item.sources[0].url || null;
  }
  return null;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Chat message display component
 */
function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isUser
          ? 'bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white rounded-tr-md'
          : 'bg-muted text-foreground rounded-tl-md'
          }`}
      >
        {content}
      </div>
    </div>
  );
}

/**
 * Loading indicator for chat
 */
function LoadingDots() {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-md">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Chat interface component
 * Fixed height layout with scrollable messages and input pinned at bottom
 */
function ChatInterface({ messages, isLoading, onSendMessage }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-[300px]">
      {/* Scrollable messages area */}
      <div className="flex-1 overflow-y-auto py-2 min-h-0">
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} role={msg.role} content={msg.content} />
        ))}
        {isLoading && <LoadingDots />}
      </div>

      {/* Input pinned at bottom */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t border-border mt-auto">
        <div className="flex-1 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="flex-shrink-0 p-2.5 rounded-xl bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Hero image with fallback to emoji on gradient background
 */
function HeroImage({ imageUrl, emoji, type }) {
  const [imageError, setImageError] = useState(false);

  const gradientClasses = type === 'paper'
    ? 'from-[hsl(280,70%,50%)] via-[hsl(300,60%,45%)] to-[hsl(320,70%,50%)]'
    : 'from-[hsl(220,70%,50%)] via-[hsl(200,70%,45%)] to-[hsl(185,70%,50%)]';

  // Show fallback if no image URL or image failed to load
  if (!imageUrl || imageError) {
    return (
      <div className={`relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gradient-to-br ${gradientClasses}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl drop-shadow-lg" role="img" aria-label="Topic emoji">
            {emoji || (type === 'paper' ? '📄' : '📰')}
          </span>
        </div>
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-muted">
      <img
        src={imageUrl}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
        loading="lazy"
      />
    </div>
  );
}

/**
 * Emoji badge component
 */
function EmojiBadge({ emoji, type }) {
  const gradientClasses = type === 'paper'
    ? 'from-[hsl(280,85%,60%)] to-[hsl(320,85%,55%)]'
    : 'from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)]';

  const defaultEmoji = type === 'paper' ? '📄' : '📰';

  return (
    <div className={`w-10 h-10 bg-gradient-to-br ${gradientClasses} rounded-xl flex items-center justify-center shadow-sm`}>
      <span className="text-lg" role="img" aria-hidden="true">
        {emoji || defaultEmoji}
      </span>
    </div>
  );
}

/**
 * Category tags component for papers
 */
function CategoryTags({ categories }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {categories.slice(0, 3).map((category, idx) => (
        <span
          key={idx}
          className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-md"
        >
          {category}
        </span>
      ))}
    </div>
  );
}

// =============================================================================
// TYPE CONFIGURATION
// =============================================================================

const TYPE_CONFIG = {
  story: {
    gradientFrom: 'from-[hsl(220,85%,60%)]',
    gradientTo: 'to-[hsl(185,85%,55%)]',
    shadowColor: 'shadow-[hsl(220,85%,60%)]/30',
    idField: 'storyId',
    placeholder: 'Ask AI about this story...',
  },
  paper: {
    gradientFrom: 'from-[hsl(280,85%,60%)]',
    gradientTo: 'to-[hsl(320,85%,55%)]',
    shadowColor: 'shadow-[hsl(280,85%,60%)]/30',
    idField: 'paperId',
    placeholder: 'Ask AI about this paper...',
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Main ContentCard component
 */
export default function ContentCard({
  item,
  rank,
  type = 'story', // 'story' or 'paper'
}) {
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [isChatMode, setIsChatMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [summaryInput, setSummaryInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Use appropriate chat mutation based on type
  const storyMutation = useStoryChatMutation();
  const paperMutation = usePaperChatMutation();
  const mutation = type === 'paper' ? paperMutation : storyMutation;

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.story;
  const cleanSummary = stripCitations(item.summary);

  // Derive display values
  const primaryCategory = getPrimaryCategory(item.categories);
  const primaryUrl = getPrimaryUrl(item, type);
  const dateLabel = type === 'paper'
    ? formatDateToMonthYear(item.publicationDate)
    : formatDateToMonthYear(item.eventDate);

  // Handle sending a message from chat interface
  const handleSendMessage = useCallback(
    (message) => {
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }
      setMessages((prev) => [...prev, { role: 'user', content: message }]);
      const payload = { message, sessionId };
      payload[config.idField] = item.id;
      mutation.mutate(payload, {
        onSuccess: (data) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
          if (data.sessionId) setSessionId(data.sessionId);
        },
        onError: (error) => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `Sorry, I encountered an error: ${error.message || 'Please try again.'}` }
          ]);
        }
      });
    },
    [mutation, item.id, sessionId, config.idField, isAuthenticated, openAuthModal]
  );

  // Handle starting a chat from summary view
  const handleStartChat = useCallback(
    (e) => {
      e.preventDefault();
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }
      const message = summaryInput.trim();
      if (message) {
        const newSessionId = generateSessionId();
        setSessionId(newSessionId);
        setMessages([{ role: 'user', content: message }]);
        setIsChatMode(true);
        setSummaryInput('');

        const payload = { message, sessionId: newSessionId };
        payload[config.idField] = item.id;
        mutation.mutate(payload, {
          onSuccess: (data) => {
            setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
            if (data.sessionId) setSessionId(data.sessionId);
          },
          onError: (error) => {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: `Sorry, I encountered an error: ${error.message || 'Please try again.'}` }
            ]);
          }
        });
      }
    },
    [summaryInput, mutation, item.id, config.idField, isAuthenticated, openAuthModal]
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
    <article className="bg-card border border-border rounded-xl overflow-hidden shadow-card hover:shadow-hover transition-all duration-200 flex flex-col">
      <div className="p-4 flex flex-col flex-1">
        {/* Card Header: Emoji + Title + Subtitle */}
        <div className="flex items-start gap-3 mb-3">
          {/* Emoji Badge */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <EmojiBadge emoji={item.emoji} type={type} />
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

          {/* Title and Meta */}
          <div className="flex-1 min-w-0">
            {primaryUrl ? (
              <a
                href={primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {stripCitations(item.title)}
                </h3>
              </a>
            ) : (
              <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2">
                {stripCitations(item.title)}
              </h3>
            )}

            {/* Subtitle: Category • Date OR Source for papers */}
            <p className="text-sm text-muted-foreground mt-1">
              {type === 'paper' && item.sourceName ? (
                <>
                  {primaryCategory && <span>{primaryCategory}</span>}
                  {primaryCategory && item.sourceName && <span className="mx-1.5">•</span>}
                  <span className="text-primary font-medium">{item.sourceName}</span>
                </>
              ) : (
                <>
                  {primaryCategory && <span>{primaryCategory}</span>}
                  {primaryCategory && dateLabel && <span className="mx-1.5">•</span>}
                  {dateLabel && <span>{dateLabel}</span>}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Hero Image */}
        <div className="mb-3">
          <HeroImage imageUrl={item.imageUrl} emoji={item.emoji} type={type} />
        </div>

        {/* Conditional Content: Summary or Chat */}
        {!isChatMode ? (
          <div className="flex-1 flex flex-col">
            {/* Summary - expandable */}
            <div>
              <p className={`text-muted-foreground text-sm leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                {cleanSummary}
              </p>
              {cleanSummary && cleanSummary.length > 150 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-sm text-primary hover:text-primary/80 font-medium mt-1 transition-colors"
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>

            {/* Story-specific: Sources */}
            {type === 'story' && item.sources && item.sources.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Sources</h4>
                <ul className="space-y-1">
                  {item.sources.slice(0, 2).map((source, idx) => (
                    <li key={idx}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors group"
                      >
                        <ExternalLinkIcon className="h-3.5 w-3.5 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                        <span className="font-medium truncate">{source.sourceName || 'Source'}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Paper-specific: Authors */}
            {type === 'paper' && item.authors && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                {stripCitations(item.authors)}
              </p>
            )}

            {/* Paper-specific: Category tags */}
            {type === 'paper' && <CategoryTags categories={item.categories} />}

            {/* Spacer to push chat input to bottom */}
            <div className="flex-1" />

            {/* Chat Input */}
            <form onSubmit={handleStartChat} className="mt-4 pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MessageCircleIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={summaryInput}
                  onChange={(e) => setSummaryInput(e.target.value)}
                  onKeyDown={handleSummaryInputKeyDown}
                  placeholder={config.placeholder}
                  className="flex-1 bg-transparent border-none text-sm placeholder:text-muted-foreground focus:outline-none min-w-0"
                />
                <SparklesIcon className="h-4 w-4 text-primary/60 flex-shrink-0" />
              </div>
            </form>
          </div>
        ) : (
          // Chat Mode
          <div className="flex-1">
            <ChatInterface
              messages={messages}
              isLoading={mutation.isPending}
              onSendMessage={handleSendMessage}
            />
          </div>
        )}
      </div>
    </article>
  );
}

