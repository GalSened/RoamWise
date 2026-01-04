/**
 * SuggestionChips - Quick action suggestions
 */

interface Suggestion {
  id: string;
  text: string;
  emoji?: string;
}

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onSelect: (text: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  return (
    <div className="suggestion-chips">
      <span className="suggestions-label">Suggestions</span>
      <div className="chips-container">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            className="suggestion-chip"
            onClick={() => onSelect(suggestion.text)}
          >
            {suggestion.emoji && (
              <span className="chip-emoji">{suggestion.emoji}</span>
            )}
            <span className="chip-text">{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
