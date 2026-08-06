"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GameRoom } from "@/components/room/game-room";
import { JoinPanel, type JoinResult } from "@/components/join-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { normalizeRoomCode } from "@/lib/room-ui";
import { loadSession, type SessionData } from "@/lib/session-client";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = normalizeRoomCode(String(params?.code ?? ""));

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const [joined, setJoined] = useState<JoinResult | null>(null);

  useEffect(() => {
    setSession(loadSession());
    setSessionLoaded(true);
  }, []);

  if (!code) {
    return (
      <main className="room-page room-page--message">
        <p>Código de sala inválido.</p>
        <Link className="text-link" href="/">
          Voltar ao início
        </Link>
      </main>
    );
  }

  if (joined) {
    return (
      <main className="room-page">
        <GameRoom
          code={code}
          initialRoom={joined.room}
          player={joined.player}
          playerToken={joined.playerToken}
          hostToken={joined.hostToken}
          onLeave={() => router.push("/")}
        />
      </main>
    );
  }

  if (!sessionLoaded) {
    return <main className="room-page room-page--message" aria-hidden="true" />;
  }

  return (
    <main className="room-page room-page--join">
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
      <JoinPanel
        roomCode={code}
        existingSession={session && session.roomCode === code ? session : null}
        onJoined={setJoined}
      />
    </main>
  );
}
