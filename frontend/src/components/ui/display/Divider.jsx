/**
 * Divider Component
 *
 * A horizontal divider with optional centered text label.
 * Commonly used in auth forms to separate sections (e.g., "or" between options).
 *
 * @component
 *
 * @example
 * // Simple divider with "or" text
 * <Divider>or</Divider>
 *
 * @example
 * // Divider without text (just a line)
 * <Divider />
 *
 * @example
 * // Custom text and spacing
 * <Divider className="my-8">continue with</Divider>
 */

export default function Divider({ children, className = 'my-6' }) {
  // If no children, render a simple horizontal line
  if (!children) {
    return <div className={`border-t border-border ${className}`} />;
  }

  // Render divider with centered text label
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex-1 border-t border-border" />
      <span className="px-3 text-sm text-muted-foreground">{children}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}
