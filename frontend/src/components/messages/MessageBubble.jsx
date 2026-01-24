export default function MessageBubble({ message }) {
  const isSent = message.isSentByCurrentUser;

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          rounded-2xl px-4 py-2 max-w-[60%] lg:max-w-md
          ${isSent
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
          }
        `}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <span
          className={`
            text-xs mt-1 block
            ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}
          `}
        >
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}
