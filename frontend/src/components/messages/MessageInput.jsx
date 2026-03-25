import ChatInput from '../ui/forms/ChatInput';

export default function MessageInput({ onSend, disabled = false, autoFocus = false }) {
  return (
    <div className="p-4 flex-shrink-0 gradient-mesh">
      <ChatInput
        onSend={onSend}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder="Type your message..."
      />
    </div>
  );
}
