"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { EMOJI_OPTIONS } from "@/lib/emoji-options";
import type { KlipyGif } from "@/lib/klipy/client";
import { translateError } from "@/lib/room-ui";
import type { Player } from "@/lib/types";

type AvatarPickerProps = {
  value: Player["avatar"];
  onChange: (avatar: Player["avatar"]) => void;
};

type PopoverKind = "emoji" | "gif" | null;

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const [tab, setTab] = useState<"emoji" | "gif">(
    value.type === "gif" ? "gif" : "emoji",
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KlipyGif[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [popover, setPopover] = useState<PopoverKind>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popover) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPopover(null);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setPopover(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [popover]);

  async function runSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    setError("");
    try {
      const response = await fetch(
        `/api/klipy/search?q=${encodeURIComponent(trimmed)}`,
      );
      const data = (await response.json()) as {
        results?: KlipyGif[];
        error?: string;
      };
      if (!response.ok) {
        setError(translateError(data.error ?? "Falha ao buscar GIFs."));
        setResults([]);
        setPopover(null);
        return;
      }
      const next = data.results ?? [];
      setResults(next);
      setPopover(next.length > 0 ? "gif" : null);
    } catch {
      setError(translateError("Falha ao buscar GIFs."));
      setResults([]);
      setPopover(null);
    } finally {
      setSearching(false);
    }
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void runSearch();
  }

  function selectEmoji(emoji: string) {
    onChange({ type: "emoji", value: emoji });
    setPopover(null);
  }

  function selectGif(url: string) {
    onChange({ type: "gif", value: url });
    setPopover(null);
  }

  return (
    <div className="avatar-picker" ref={rootRef}>
      <div className="avatar-picker__preview" aria-hidden="true">
        {value.type === "gif" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.value} alt="" />
        ) : (
          <span>{value.value}</span>
        )}
      </div>

      <div className="avatar-picker__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "emoji"}
          className={`avatar-picker__tab ${tab === "emoji" ? "is-active" : ""}`}
          onClick={() => {
            setTab("emoji");
            setPopover(null);
          }}
        >
          Emoji
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "gif"}
          className={`avatar-picker__tab ${tab === "gif" ? "is-active" : ""}`}
          onClick={() => {
            setTab("gif");
            setPopover(null);
          }}
        >
          GIF
        </button>
      </div>

      {tab === "emoji" ? (
        <div className="avatar-picker__emoji">
          <button
            type="button"
            className="avatar-picker__open"
            aria-expanded={popover === "emoji"}
            aria-haspopup="dialog"
            onClick={() =>
              setPopover((current) => (current === "emoji" ? null : "emoji"))
            }
          >
            Abrir emojis
          </button>
          {popover === "emoji" ? (
            <div
              className="avatar-picker__popover"
              role="dialog"
              aria-label="Escolher emoji"
            >
              <div className="avatar-picker__grid">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`avatar-picker__option ${
                      value.type === "emoji" && value.value === emoji
                        ? "is-selected"
                        : ""
                    }`}
                    onClick={() => selectEmoji(emoji)}
                    aria-label={`Usar avatar ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="avatar-picker__gif">
          <div className="avatar-picker__search">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar GIF (ex.: comemorar)"
              aria-label="Buscar GIF"
              autoComplete="off"
            />
            <button
              type="button"
              disabled={searching}
              onClick={() => void runSearch()}
            >
              {searching ? "Buscando…" : "Buscar"}
            </button>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {results.length > 0 ? (
            <div className="avatar-picker__gif-meta">
              <span>
                {results.length} resultado{results.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                className="avatar-picker__open"
                aria-expanded={popover === "gif"}
                aria-haspopup="dialog"
                onClick={() =>
                  setPopover((current) => (current === "gif" ? null : "gif"))
                }
              >
                Ver GIFs
              </button>
            </div>
          ) : null}
          {popover === "gif" ? (
            <div
              className="avatar-picker__popover"
              role="dialog"
              aria-label="Escolher GIF"
            >
              <div className="avatar-picker__gif-grid">
                {results.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    className={`avatar-picker__gif-option ${
                      value.type === "gif" && value.value === gif.url
                        ? "is-selected"
                        : ""
                    }`}
                    onClick={() => selectGif(gif.url)}
                    aria-label="Usar este GIF como avatar"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gif.preview} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
