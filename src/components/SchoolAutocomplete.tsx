import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchSchools, findExactSchoolMatch } from "../lib/ncaaSchools";

interface SchoolAutocompleteProps {
  /** The standardized/committed value (e.g. draft.university). */
  value: string;
  /** Fires only when the user confirms a standardized school name (click or exact-match blur). */
  onChange: (value: string) => void;
  placeholder?: string;
  /** Extra classes for the suggestion dropdown panel. */
  className?: string;
  /** Classes applied to the underlying input (merged with Tailwind-aware precedence). */
  inputClassName?: string;
  /**
   * Whether to render the built-in left-aligned search icon (with matching
   * left padding). Set to false when the consumer renders its own icon and
   * supplies custom padding via `inputClassName`.
   * @default true
   */
  showIcon?: boolean;
  /** Forwarded to the underlying input, e.g. for e2e test targeting. */
  testId?: string;
}

/**
 * Text input + suggestion dropdown that lets a user type freely but only ever
 * commits one of the standardized NCAA school names. Typing shows live,
 * ranked suggestions; clicking one (or typing an exact match and blurring)
 * confirms the value. Anything else reverts to the last confirmed value.
 */
export function SchoolAutocomplete({ value, onChange, placeholder, className, inputClassName, showIcon = true, testId }: SchoolAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const focusedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the visible text in sync with externally-loaded values, but don't
  // clobber what the user is actively typing.
  useEffect(() => {
    if (!focusedRef.current) setQuery(value);
  }, [value]);

  const suggestions = open ? searchSchools(query, 8) : [];

  const commit = (name: string) => {
    setQuery(name);
    onChange(name);
    setOpen(false);
  };

  const handleBlur = () => {
    focusedRef.current = false;
    // Let a click on a suggestion register first (see onMouseDown below).
    setTimeout(() => {
      if (!query.trim()) {
        commit("");
        return;
      }
      const exact = findExactSchoolMatch(query);
      if (exact) {
        commit(exact.name);
      } else {
        // No standardized match confirmed — revert to the last saved value
        // rather than persisting free text.
        setQuery(value);
        setOpen(false);
      }
    }, 120);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {showIcon && (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        )}
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => {
            focusedRef.current = true;
            setOpen(true);
          }}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlighted((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlighted((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              commit(suggestions[highlighted].name);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className={cn(showIcon && "pl-8", inputClassName)}
          data-testid={testId}
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className={`absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg bg-popover border border-border shadow-lg ${className ?? ""}`}>
          {suggestions.map((school, i) => (
            <button
              key={school.name}
              type="button"
              data-testid={testId ? `${testId}-option-${school.name}` : undefined}
              onMouseDown={(e) => {
                // mousedown fires before the input's blur, so the click registers.
                e.preventDefault();
                commit(school.name);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i === highlighted ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
              }`}
            >
              {school.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
