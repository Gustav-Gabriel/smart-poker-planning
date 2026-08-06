"use client";

import { useState, type FormEvent } from "react";
import type { TenorGif } from "@/lib/tenor/client";
import type { Player } from "@/lib/types";

const EMOJI_OPTIONS = [
  "🃏",
  "🚀",
  "🦊",
  "🐙",
  "🌵",
  "🐢",
  "🦄",
  "🐝",
  "🐧",
  "🦉",
  "🍀",
  "🔥",
  "⚡",
  "🎯",
  "🧠",
  "🎲",
];

type AvatarPickerProps = {
  value: Player["avatar"];
  onChange: (avatar: Player["avatar"]) => void;
};

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const [tab, setTab] = useState<"emoji" | "gif">(
    value.type === "gif" ? "gif" : "emoji",
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TenorGif[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    setError("");
    try {
      const response = await fetch(
        `/api/tenor/search?q=${encodeURIComponent(trimmed)}`,
      );
      const data = (await response.json()) as {
        results?: TenorGif[];
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Falha ao buscar GIFs.");
        setResults([]);
        return;
      }
      setResults(data.results ?? []);
    } catch {
      setError("Falha ao buscar GIFs.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="avatar-picker">
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
          onClick={() => setTab("emoji")}
        >
          Emoji
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "gif"}
          className={`avatar-picker__tab ${tab === "gif" ? "is-active" : ""}`}
          onClick={() => setTab("gif")}
        >
          GIF
        </button>
      </div>

      {tab === "emoji" ? (
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
              onClick={() => onChange({ type: "emoji", value: emoji })}
              aria-label={`Usar avatar ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : (
        <div className="avatar-picker__gif">
          <form className="avatar-picker__search" onSubmit={handleSearch}>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar GIF (ex.: comemorar)"
              aria-label="Buscar GIF"
            />
            <button type="submit" disabled={searching}>
              {searching ? "Buscando…" : "Buscar"}
            </button>
          </form>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
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
                onClick={() => onChange({ type: "gif", value: gif.url })}
                aria-label="Usar este GIF como avatar"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gif.preview} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
