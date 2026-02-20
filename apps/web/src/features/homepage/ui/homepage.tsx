import {
  developerSignals,
  footerLinkGroups,
  homepageFeatureCards
} from '../content/public-docs';

interface HomepageProps {
  onLoginClick: () => void;
  onDocsClick: () => void;
  onDocClick: (slug: string) => void;
  onAlphaAccessClick: () => void;
}

export function Homepage({ onLoginClick, onDocsClick, onDocClick, onAlphaAccessClick }: HomepageProps) {
  return (
    <main className="homepage" aria-label="MonoTask homepage">
      <header className="homepage-nav">
        <div className="homepage-brand" aria-label="MonoTask">
          <span className="homepage-brand-mark">M</span>
          <span className="homepage-brand-name">MonoTask</span>
        </div>

        <div className="homepage-nav-actions">
          <button type="button" className="homepage-link-muted" onClick={onDocsClick}>
            Documentation
          </button>
          <button type="button" className="primary-btn" onClick={onLoginClick}>
            Login
          </button>
        </div>
      </header>

      <section className="homepage-hero" aria-labelledby="homepage-title">
        <h1 id="homepage-title">
          The task manager for solo developers
        </h1>
        <p>
          Plan faster, break down work clearly, and move from epic to done without chaos. MonoTask helps developers
          manage tasks with structure, speed, and focus.
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
          <p>Built for solo developers working with</p>
          <ul>
            {developerSignals.map((item) => (
              <li key={item.label}>
                <a
                  href={createDocPath(item.docSlug)}
                  className="homepage-link-inline"
                  onClick={(event) => {
                    event.preventDefault();
                    onDocClick(item.docSlug);
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
              <a
                href={createDocPath(feature.docSlug)}
                className="homepage-link-inline"
                onClick={(event) => {
                  event.preventDefault();
                  onDocClick(feature.docSlug);
                }}
              >
                Open documentation
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="homepage-cta" id="start" aria-label="Call to action">
        <h2>Ready to regain your focus?</h2>
        <p>Built for developers who want to ship faster with structured execution workflows.</p>
        <div className="homepage-cta-actions">
          <button type="button" className="primary-btn" onClick={onLoginClick}>
            Login
          </button>
          <button type="button" className="ghost-btn" onClick={onDocsClick}>
            Browse Public Docs
          </button>
        </div>
      </section>

      <footer className="homepage-footer" aria-label="Homepage footer">
        <div className="footer-brand">
          <div className="homepage-brand">
            <span className="homepage-brand-mark">M</span>
            <span className="homepage-brand-name">MonoTask</span>
          </div>
          <p>Minimal task management for developer-first workflows, with agentic mode on the roadmap.</p>
        </div>

        {footerLinkGroups.map((group) => (
          <nav key={group.heading} aria-label={`${group.heading} links`}>
            <h3>{group.heading}</h3>
            <ul>
              {group.links.map((link) => (
                <li key={link.slug}>
                  <a
                    href={createDocPath(link.slug)}
                    className="homepage-footer-link"
                    onClick={(event) => {
                      event.preventDefault();
                      onDocClick(link.slug);
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </footer>
    </main>
  );
}

function createDocPath(slug: string): string {
  if (slug === 'docs') {
    return '/docs';
  }

  return `/docs/${encodeURIComponent(slug)}`;
}
