/**
 * ContentCard Component
 *
 * A unified card component for displaying AI news stories and research papers.
 * Both types share the same chat functionality and card structure, with
 * type-specific content sections.
 *
 * Features:
 * - Summary mode with type-specific content (sources for news, findings for papers)
 * - Interactive AI chat that replaces summary when active
 * - Rank badge with configurable gradient colors
 * - Back button to return from chat to summary
 *
 * @component
 *
 * @example
 * // News story
 * <ContentCard
 *   item={story}
 *   rank={1}
 *   type="story"
 *   chatMutation={useStoryChatMutation()}
 * />
 *
 * @example
 * // Research paper
 * <ContentCard
 *   item={paper}
 *   rank={1}
 *   type="paper"
 *   chatMutation={usePaperChatMutation()}
 * />
 */

import { useState, useCallback, useRef } from 'react';
import { ExternalLinkIcon, ArrowLeftIcon, ChatBubbleIcon, SendIcon } from './icons';
import { useStoryChatMutation, usePaperChatMutation } from '../hooks/useNews';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';

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
 * Chat message display component
 */
function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
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

/**
 * Configuration for each content type
 */
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

  // Use appropriate chat mutation based on type
  // Both hooks are called unconditionally to follow React's rules of hooks
  const storyMutation = useStoryChatMutation();
  const paperMutation = usePaperChatMutation();
  const mutation = type === 'paper' ? paperMutation : storyMutation;

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.story;
  const cleanSummary = stripCitations(item.summary);

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
    <article className="bg-card border border-border rounded-lg overflow-hidden shadow-card hover:shadow-hover transition-all duration-200">
      <div className="p-5">
        {/* Card Header */}
        <div className="flex items-start gap-4">
          {/* Rank Badge Column */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className={`w-8 h-8 bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} rounded-lg flex items-center justify-center`}>
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

          {/* Title and Meta */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground leading-snug mb-1">
              {stripCitations(item.title)}
            </h3>

            {/* Paper-specific: Authors */}
            {type === 'paper' && item.authors && (
              <p className="text-sm text-muted-foreground mb-2">{stripCitations(item.authors)}</p>
            )}
          </div>
        </div>

        {/* Conditional Content */}
        {!isChatMode ? (
          <div className="mt-4">
            {/* Summary */}
            <p className="text-muted-foreground text-sm leading-relaxed">{cleanSummary}</p>

            {/* Story-specific: Sources */}
            {type === 'story' && item.sources && item.sources.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Sources</h4>
                <ul className="space-y-1.5">
                  {item.sources.map((source, idx) => (
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

            {/* Paper-specific: Key Findings */}
            {type === 'paper' && item.keyFindings && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-foreground mb-1.5">Key Findings</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {stripCitations(item.keyFindings)}
                </p>
              </div>
            )}

            {/* Paper-specific: Read Paper Link */}
            {type === 'paper' && item.paperUrl && (
              <div className="mt-4">
                <a
                  href={item.paperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <span>Read Paper</span>
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                </a>
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
                  placeholder={config.placeholder}
                  className="flex-1 bg-transparent border-none text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!summaryInput.trim() || mutation.isPending}
                  className={`p-2 rounded-lg bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} text-white hover:shadow-lg hover:${config.shadowColor} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
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
              isLoading={mutation.isPending}
              onSendMessage={handleSendMessage}
            />
          </div>
        )}
      </div>
    </article>
  );
}
