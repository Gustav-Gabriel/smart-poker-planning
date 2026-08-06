"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { saveSession } from "@/lib/session-client";
import { getSocket } from "@/lib/socket/client";
import type { AiProvider, DeckType, Player } from "@/lib/types";
import { Button } from "./ui/button";
import { InputField, SelectField } from "./ui/field";

export type CreateRoomFields = {
  roomName: string;
  deck: DeckType;
  aiProvider: AiProvider;
  aiApiKey: string;
  jiraSite: string;
  jiraEmail: string;
  jiraToken: string;
  gitToken: string;
  hostName: string;
  hostEmoji: string;
};

export function buildRoomPayload(fields: CreateRoomFields) {
  const gitToken = fields.gitToken.trim();
  return {
    name: fields.roomName.trim(),
    deck: fields.deck,
    hostName: fields.hostName.trim(),
    hostAvatar: { type: "emoji" as const, value: fields.hostEmoji },
    secrets: {
      aiProvider: fields.aiProvider,
      aiApiKey: fields.aiApiKey.trim(),
      jiraSite: fields.jiraSite.trim().replace(/\/+$/, ""),
      jiraEmail: fields.jiraEmail.trim(),
      jiraToken: fields.jiraToken.trim(),
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
      aiApiKey: String(form.get("aiApiKey") ?? ""),
      jiraSite: String(form.get("jiraSite") ?? ""),
      jiraEmail: String(form.get("jiraEmail") ?? ""),
      jiraToken: String(form.get("jiraToken") ?? ""),
      gitToken: String(form.get("gitToken") ?? ""),
      hostName: String(form.get("hostName") ?? ""),
      hostEmoji: String(form.get("hostEmoji") ?? "🃏"),
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
            setError(response?.error ?? "Não foi possível criar a sala.");
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
            <p>Use seu próprio provedor para enriquecer a discussão.</p>
          </div>
        </div>
        <div className="field-grid">
          <SelectField
            id="aiProvider"
            name="aiProvider"
            label="Provedor"
            defaultValue="openai"
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="claude">Anthropic Claude</option>
          </SelectField>
          <InputField
            id="aiApiKey"
            name="aiApiKey"
            label="Chave da API"
            type="password"
            placeholder="Cole sua chave"
            autoComplete="off"
            required
          />
        </div>
      </section>

      <section className="form-section">
        <div className="form-section__heading">
          <span>03</span>
          <div>
            <h2>Contexto do trabalho</h2>
            <p>Conecte Jira e GitHub para estimativas mais informadas.</p>
          </div>
        </div>
        <div className="field-grid">
          <InputField
            id="jiraSite"
            name="jiraSite"
            label="Site do Jira"
            type="url"
            placeholder="https://suaempresa.atlassian.net"
            required
          />
          <InputField
            id="jiraEmail"
            name="jiraEmail"
            label="E-mail do Jira"
            type="email"
            placeholder="voce@empresa.com"
            autoComplete="email"
            required
          />
          <InputField
            id="jiraToken"
            name="jiraToken"
            label="Token do Jira"
            type="password"
            placeholder="Token de acesso"
            autoComplete="off"
            required
          />
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
          <SelectField
            id="hostEmoji"
            name="hostEmoji"
            label="Avatar"
            defaultValue="🃏"
          >
            <option value="🃏">🃏 Coringa</option>
            <option value="🚀">🚀 Foguete</option>
            <option value="🦊">🦊 Raposa</option>
            <option value="🐙">🐙 Polvo</option>
            <option value="🌵">🌵 Cacto</option>
          </SelectField>
        </div>
      </section>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="form-actions">
        <p>Suas credenciais ficam protegidas no servidor durante a sessão.</p>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Criando sala…" : "Criar sala"}
          <span aria-hidden="true">→</span>
        </Button>
      </div>
    </form>
  );
}
