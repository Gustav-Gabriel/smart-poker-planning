import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="landing">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Smart Planning Poker">
          <span className="wordmark__mark">S</span>
          <span>Smart Planning Poker</span>
        </Link>
        <span className="site-header__note">Feito para times que conversam</span>
      </header>

      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">
            <span aria-hidden="true">✦</span> Planning poker com contexto
          </p>
          <h1>
            Estimativas melhores começam com{" "}
            <em>conversas mais inteligentes.</em>
          </h1>
          <p className="hero__support">
            Planeje com seu time e use IA, Jira e repositórios para transformar
            contexto disperso em decisões mais claras.
          </p>
          <div className="hero__actions">
            <Link className={buttonClassName("primary")} href="/create">
              Criar sala <span aria-hidden="true">→</span>
            </Link>
            <Link className={buttonClassName("secondary")} href="/join">
              Entrar com código
            </Link>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-art__halo" />
          <div className="poker-card poker-card--back">
            <span>S</span>
          </div>
          <div className="poker-card poker-card--front">
            <small>SP</small>
            <strong>8</strong>
            <span>estimativa</span>
          </div>
          <span className="spark spark--one">✦</span>
          <span className="spark spark--two">✦</span>
        </div>
      </section>

      <footer className="landing__footer">
        <span>Contexto real</span>
        <i />
        <span>Consenso em equipe</span>
        <i />
        <span>IA a favor da conversa</span>
      </footer>
    </main>
  );
}
