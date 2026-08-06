"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AvatarPicker } from "@/components/avatar-picker";
import { translateError } from "@/lib/room-ui";
import { saveSession } from "@/lib/session-client";
import { getSocket } from "@/lib/socket/client";
import type { AiProvider, DeckType, Player } from "@/lib/types";
import { Button } from "./ui/button";
import { InputField, SelectField } from "./ui/field";

export type CreateRoomFields = {
  roomName: string;
  deck: DeckType;
  aiProvider: AiProvider;
  gitToken: string;
  hostName: string;
  hostAvatar: Player["avatar"];
};

export function buildRoomPayload(fields: CreateRoomFields) {
  const gitToken = fields.gitToken.trim();
  return {
    name: fields.roomName.trim(),
    deck: fields.deck,
    hostName: fields.hostName.trim(),
    hostAvatar: fields.hostAvatar,
    secrets: {
      aiProvider: fields.aiProvider,
      ...(gitToken ? { gitToken } : {}),
    },
  };
}

type CreateAck =
  | {
      room: { code: string };
      player: Player;
      hostToken: string;
      playerToken: string;
    }
  | { ok: false; error: string };

export function CreateRoomForm() {
  const router = useRouter();
  const [hostAvatar, setHostAvatar] = useState<Player["avatar"]>({
    type: "emoji",
    value: "🃏",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const fields: CreateRoomFields = {
      roomName: String(form.get("roomName") ?? ""),
      deck: String(form.get("deck")) as DeckType,
      aiProvider: String(form.get("aiProvider")) as AiProvider,
      gitToken: String(form.get("gitToken") ?? ""),
      hostName: String(form.get("hostName") ?? ""),
      hostAvatar,
    };

    getSocket()
      .timeout(10_000)
      .emit(
        "room:create",
        buildRoomPayload(fields),
        (timeoutError: Error | null, response: CreateAck) => {
          if (timeoutError) {
            setError("A conexão demorou demais. Tente novamente.");
            setSubmitting(false);
            return;
          }
          if (!response || "ok" in response) {
            setError(
              translateError(response?.error) ||
                "Não foi possível criar a sala.",
            );
            setSubmitting(false);
            return;
          }

          saveSession({
            roomCode: response.room.code,
            playerId: response.player.id,
            playerToken: response.playerToken,
            hostToken: response.hostToken,
            name: response.player.name,
            avatar: response.player.avatar,
          });
          router.push(`/room/${response.room.code}`);
        },
      );
  }

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <section className="form-section">
        <div className="form-section__heading">
          <span>01</span>
          <div>
            <h2>Sua sala</h2>
            <p>Defina o espaço e como o time vai estimar.</p>
          </div>
        </div>
        <div className="field-grid">
          <InputField
            id="roomName"
            name="roomName"
            label="Nome da sala"
            placeholder="Ex.: Planejamento da Sprint 24"
            autoComplete="off"
            required
          />
          <SelectField id="deck" name="deck" label="Baralho" defaultValue="fibonacci">
            <option value="fibonacci">Fibonacci</option>
            <option value="tshirt">Tamanhos (XS a XL)</option>
          </SelectField>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section__heading">
          <span>02</span>
          <div>
            <h2>Copiloto de IA</h2>
            <p>
              O servidor usa a chave configurada no ambiente para o provedor
              escolhido.
            </p>
          </div>
        </div>
        <div className="field-grid">
          <SelectField
            id="aiProvider"
            name="aiProvider"
            label="Provedor"
            defaultValue="gemini"
          >
            <option value="gemini">Google Gemini</option>
            {/* Temporarily hidden — keys remain wired via OPENAI_API_KEY / ANTHROPIC_API_KEY
            <option value="openai">OpenAI</option>
            <option value="claude">Anthropic Claude</option>
            */}
          </SelectField>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section__heading">
          <span>03</span>
          <div>
            <h2>Contexto do trabalho</h2>
            <p>
              Jira já vem das variáveis de ambiente do servidor. Token do GitHub
              é opcional para repositórios privados.
            </p>
          </div>
        </div>
        <div className="field-grid">
          <InputField
            id="gitToken"
            name="gitToken"
            label="Token do GitHub"
            type="password"
            placeholder="Opcional"
            autoComplete="off"
            hint="Opcional — PAT para repositórios privados do GitHub. Código local (zip/pasta) não precisa de token."
          />
        </div>
      </section>

      <section className="form-section">
        <div className="form-section__heading">
          <span>04</span>
          <div>
            <h2>Quem está criando?</h2>
            <p>Você será o anfitrião desta sessão.</p>
          </div>
        </div>
        <div className="host-fields">
          <InputField
            id="hostName"
            name="hostName"
            label="Seu nome"
            placeholder="Como o time chama você?"
            autoComplete="name"
            required
          />
          <div className="field">
            <p className="field-label">Avatar</p>
            <AvatarPicker value={hostAvatar} onChange={setHostAvatar} />
          </div>
        </div>
      </section>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="form-actions">
        <p>
          IA e Jira usam as chaves do servidor; tokens opcionais ficam só na
          memória da sessão.
        </p>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Criando sala…" : "Criar sala"}
          <span aria-hidden="true">→</span>
        </Button>
      </div>
    </form>
  );
}
