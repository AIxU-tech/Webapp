/**
 * Animated Icons
 * Icons with built-in animations for loading states and feedback.
 */

export const LoadingDotsIcon = ({ className = '' }) => (
  <div className={`flex items-center gap-1 ${className}`}>
    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);

