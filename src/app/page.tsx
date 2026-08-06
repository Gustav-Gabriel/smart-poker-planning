import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClassName } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="landing">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Smart Planning Poker">
          <span className="wordmark__mark">S</span>
          <span>Smart Planning Poker</span>
        </Link>
        <div className="site-header__actions">
          <span className="site-header__note">Feito para times que conversam</span>
          <ThemeToggle />
        </div>
      </header>

      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">
            <span aria-hidden="true">✦</span> Planning poker com contexto
          </p>
          <h1>Smart Planning Poker</h1>
          <p className="hero__support">
            Estimativas melhores começam com conversas mais inteligentes —
            com IA, Jira e repositórios no mesmo lugar.
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
