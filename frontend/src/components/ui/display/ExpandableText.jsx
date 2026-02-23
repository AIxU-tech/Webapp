import { useState, useRef, useLayoutEffect } from 'react';

const LINE_CLAMP_CLASS = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6',
};

export default function ExpandableText({ text, lines = 4, className = '' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || isExpanded) return;
    setIsClamped(el.scrollHeight > el.clientHeight);
  }, [text, isExpanded]);

  const clampClass = LINE_CLAMP_CLASS[lines] || 'line-clamp-4';

  return (
    <div>
      <p
        ref={textRef}
        className={`whitespace-pre-wrap ${!isExpanded ? clampClass : ''} ${className}`}
      >
        {text}
      </p>
      {isClamped && (
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
