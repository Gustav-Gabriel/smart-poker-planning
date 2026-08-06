import Link from "next/link";
import { CreateRoomForm } from "@/components/create-room-form";

export default function CreateRoomPage() {
  return (
    <main className="create-page">
      <header className="site-header site-header--compact">
        <Link className="wordmark" href="/" aria-label="Smart Planning Poker">
          <span className="wordmark__mark">S</span>
          <span>Smart Planning Poker</span>
        </Link>
        <Link className="text-link" href="/">
          Voltar ao início
        </Link>
      </header>

      <div className="create-layout">
        <aside className="create-intro">
          <p className="eyebrow">Nova sessão</p>
          <h1>Prepare o contexto. O time cuida da conversa.</h1>
          <p>
            Configure as integrações uma vez e comece uma rodada de estimativas
            com tudo que importa à mão.
          </p>
          <div className="privacy-note">
            <span aria-hidden="true">✦</span>
            <p>
              Chaves e tokens nunca aparecem para os participantes da sala.
            </p>
          </div>
        </aside>

        <CreateRoomForm />
      </div>
    </main>
  );
}
