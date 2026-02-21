import { developerSignals, homepageFeatureCards } from '../content/public-docs';

interface HomepageProps {
  onLoginClick: () => void;
  onMcpClick: () => void;
  onAlphaAccessClick: () => void;
}

export function Homepage({ onLoginClick, onMcpClick, onAlphaAccessClick }: HomepageProps) {
  return (
    <main className="homepage" aria-label="MonoTask homepage">
      <header className="homepage-nav">
        <div className="homepage-nav-inner">
          <div className="homepage-brand" aria-label="MonoTask">
            <span className="homepage-brand-mark">M</span>
            <span className="homepage-brand-name">MonoTask</span>
          </div>

          <div className="homepage-nav-actions">
            <button type="button" className="primary-btn" onClick={onLoginClick}>
              Login
            </button>
          </div>
        </div>
      </header>

      <section className="homepage-hero" aria-labelledby="homepage-title">
        <h1 id="homepage-title">
          The task manager for solo developers
        </h1>
        <p>
          Plan faster, break down work clearly, and move from epic to done without chaos. MonoTask helps developers
          manage tasks with structure, speed, and focus. Built to be self-hosted from day one.
        </p>

        <div className="homepage-hero-actions">
          <button type="button" className="primary-btn" onClick={onLoginClick}>
            Login
          </button>
          <button type="button" className="ghost-btn" onClick={onAlphaAccessClick}>
            Ask for Alpha Access
          </button>
          <a className="homepage-demo-btn" href="#features">
            Learn More
          </a>
        </div>

        <article className="homepage-mockup" aria-label="Application preview">
          <div className="homepage-mockup-topbar">
            <span className="dot dot-red" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
          </div>

          <div className="homepage-mockup-layout">
            <aside className="homepage-mockup-sidebar" aria-hidden="true">
              <div className="sidebar-brand-skeleton" />
              <div className="sidebar-item-skeleton" />
              <div className="sidebar-item-skeleton" />
              <div className="sidebar-item-skeleton" />
              <div className="sidebar-user-skeleton" />
            </aside>

            <div className="homepage-mockup-content" aria-hidden="true">
              <div className="mockup-headline-row">
                <div>
                  <p className="mockup-title">Q1 Roadmap</p>
                  <p className="mockup-tabs">All Tasks | Specs | Standards</p>
                </div>
                <button type="button" className="mockup-new-btn" tabIndex={-1}>
                  New Task +
                </button>
              </div>

              <div className="mockup-board-grid">
                <section className="mockup-column">
                  <header>
                    <span>TO DO</span>
                    <span className="count">3</span>
                  </header>
                  <div className="mockup-card" />
                  <div className="mockup-card mockup-card-dashed" />
                </section>

                <section className="mockup-column">
                  <header>
                    <span>IN PROGRESS</span>
                    <span className="count">2</span>
                  </header>
                  <div className="mockup-card" />
                </section>

                <section className="mockup-column">
                  <header>
                    <span>DONE</span>
                    <span className="count">8</span>
                  </header>
                  <div className="mockup-card mockup-card-muted" />
                </section>
              </div>
            </div>
          </div>
        </article>

        <div className="homepage-signals" aria-label="Developer capabilities">
          <p>Built for solo developers who value</p>
          <ul>
            {developerSignals.map((item) => (
              <li key={item.label}>
                <a
                  href="/mcp"
                  className="homepage-link-inline"
                  onClick={(event) => {
                    event.preventDefault();
                    onMcpClick();
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="homepage-features" id="features" aria-label="Product features">
        <div className="section-heading">
          <h2>Designed for clarity</h2>
          <p>Everything needed for modern task management, without clutter or enterprise overhead.</p>
        </div>

        <div className="homepage-features-grid">
          {homepageFeatureCards.map((feature) => (
            <article key={feature.title} className="homepage-feature-card">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              {feature.linkHref && feature.linkLabel ? (
                <a
                  href={feature.linkHref}
                  className="homepage-link-inline"
                  {...(feature.isExternalLink ? { target: '_blank', rel: 'noreferrer' } : {})}
                  onClick={(event) => {
                    if (feature.linkHref === '/mcp') {
                      event.preventDefault();
                      onMcpClick();
                    }
                  }}
                >
                  {feature.linkLabel}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="homepage-cta" id="start" aria-label="Call to action">
        <h2>Ready for simpler task management?</h2>
        <p>Keep your day clear with straightforward boards, practical planning, and zero noise.</p>
        <div className="homepage-cta-actions">
          <button type="button" className="primary-btn" onClick={onLoginClick}>
            Login
          </button>
          <button type="button" className="ghost-btn" onClick={onMcpClick}>
            Open MCP Guide
          </button>
        </div>
      </section>

      <footer className="homepage-footer" aria-label="Homepage footer">
        <div className="footer-brand">
          <div className="homepage-brand">
            <span className="homepage-brand-mark">M</span>
            <span className="homepage-brand-name">MonoTask</span>
          </div>
          <p>Simple task management for solo developers who want clarity and consistent delivery.</p>
        </div>

        <nav aria-label="Resources links">
          <h3>Resources</h3>
          <ul>
            <li>
              <a
                href="/mcp"
                className="homepage-footer-link"
                onClick={(event) => {
                  event.preventDefault();
                  onMcpClick();
                }}
              >
                MCP Guide
              </a>
            </li>
          </ul>
        </nav>

        <a
          href="https://github.com/p-carrillo/project_trillo"
          className="homepage-footer-social-link"
          target="_blank"
          rel="noreferrer"
          aria-label="MonoTask GitHub repository"
          title="GitHub"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.66-.22.66-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.38-3.37-1.38-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.89 1.58 2.34 1.12 2.9.85.09-.66.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.27-.45-1.32.1-2.76 0 0 .84-.28 2.75 1.05A9.27 9.27 0 0 1 12 6.94c.85 0 1.71.12 2.52.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.44.2 2.49.1 2.76.64.72 1.03 1.63 1.03 2.75 0 3.95-2.34 4.81-4.57 5.06.36.31.68.92.68 1.86 0 1.35-.01 2.43-.01 2.76 0 .27.17.59.67.49A10.25 10.25 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z"
            />
          </svg>
          <span>GitHub</span>
        </a>
      </footer>
    </main>
  );
}
