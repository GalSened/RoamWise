/**
 * MessageList - Renders chat messages
 */
import type { AIAction } from './ActionCard';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: AIAction;
}

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message ${message.role}`}
        >
          {message.role === 'assistant' && (
            <span className="message-avatar">🤖</span>
          )}
          <div className="message-bubble">
            <div className="message-content">
              {formatContent(message.content)}
            </div>
            <span className="message-time">
              {formatTime(message.timestamp)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatContent(content: string): React.ReactNode {
  // Simple markdown-like formatting
  const lines = content.split('\n');

  return lines.map((line, idx) => {
    // Bold text **text**
    let formatted = line.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    // Bullet points
    if (line.startsWith('• ') || line.startsWith('- ')) {
      return (
        <div key={idx} className="message-bullet">
          <span dangerouslySetInnerHTML={{ __html: formatted }} />
        </div>
      );
    }

    // Numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s(.+)$/);
    if (numberedMatch) {
      return (
        <div key={idx} className="message-numbered">
          <span className="number">{numberedMatch[1]}.</span>
          <span dangerouslySetInnerHTML={{ __html: numberedMatch[2] }} />
        </div>
      );
    }

    // Regular line
    if (line.trim()) {
      return (
        <p key={idx} dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    }

    return <br key={idx} />;
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
