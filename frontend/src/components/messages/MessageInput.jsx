import { useState, useRef, useEffect } from 'react';

export default function MessageInput({ onSend, disabled = false, autoFocus = false }) {
  const [content, setContent] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 144; // ~6 lines
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [content]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setContent('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSend = content.trim().length > 0 && !disabled;

  return (
    <div className="p-4 flex-shrink-0 gradient-mesh">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          rows="1"
          className="
            flex-1 px-4 py-2
            bg-muted/50 border border-border rounded-2xl
            text-base md:text-sm
            text-foreground placeholder-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-primary
            resize-none
          "
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            transition-all duration-150
            ${canSend
              ? 'bg-primary text-white hover:bg-primary/90 active:scale-95'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
            }
          `}
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95l14.095-5.637a.75.75 0 0 0 0-1.4L3.105 2.288Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
