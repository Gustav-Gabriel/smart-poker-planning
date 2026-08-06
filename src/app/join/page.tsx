"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { normalizeRoomCode } from "@/lib/room-ui";

export default function JoinPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = normalizeRoomCode(String(form.get("roomCode") ?? ""));
    if (code.length < 4) {
      setError("Informe um código de sala válido.");
      return;
    }
    router.push(`/room/${code}`);
  }

  return (
    <main className="create-page join-page">
      <header className="site-header site-header--compact">
        <Link className="wordmark" href="/" aria-label="Smart Planning Poker">
          <span className="wordmark__mark">S</span>
          <span>Smart Planning Poker</span>
        </Link>
        <div className="site-header__actions">
          <Link className="text-link" href="/">
            Voltar ao início
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="join-layout">
        <div className="join-card">
          <p className="eyebrow">
            <span aria-hidden="true">✦</span> Entrar na sala
          </p>
          <h1>Digite o código da sala</h1>
          <p className="join-card__support">
            Peça o código de 6 caracteres para quem criou a sessão de planning
            poker.
          </p>
          <form className="join-code-form" onSubmit={handleSubmit}>
            <InputField
              id="roomCode"
              name="roomCode"
              label="Código da sala"
              placeholder="Ex.: A1B2C3"
              autoComplete="off"
              maxLength={8}
              required
              className="join-code-form__input"
            />
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit">
              Continuar <span aria-hidden="true">→</span>
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
