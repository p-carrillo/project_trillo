interface HomepageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const productLinks = ['Features', 'Roadmap', 'Docs', 'Changelog'];
const resourceLinks = ['Documentation', 'MCP Guide', 'API', 'Support'];
const developerLinks = ['Task Specs', 'Project Standards', 'Templates', 'IDE Workflow'];

const featureCards = [
  {
    title: 'Agentic Planning',
    description:
      'Create executable plans from raw ideas with milestones, scope boundaries, and verification checkpoints.'
  },
  {
    title: 'Specs First',
    description:
      'Generate technical specs before implementation, including contracts, architecture notes, and test intent.'
  },
  {
    title: 'Minimal Focus',
    description:
      'A clean interface for solo developers: less management overhead, more coding momentum.'
  }
];

const developerSignalRow = ['Plans', 'Specs', 'Standards', 'Templates', 'MCP'];

export function Homepage({ onLoginClick, onRegisterClick }: HomepageProps) {
  return (
    <main className="homepage" aria-label="Trillo homepage">
      <header className="homepage-nav">
        <div className="homepage-brand" aria-label="Trillo">
          <span className="homepage-brand-mark">T</span>
          <span className="homepage-brand-name">TrilloTask</span>
        </div>

        <nav className="homepage-nav-links" aria-label="Homepage sections">
          <a href="#features">Features</a>
          <a href="#testimonial">Testimonial</a>
          <a href="#start">Start</a>
        </nav>

        <div className="homepage-nav-actions">
          <button type="button" className="homepage-link-muted" onClick={onLoginClick}>
            Login
          </button>
          <button type="button" className="primary-btn" onClick={onRegisterClick}>
            Get Started
          </button>
        </div>
      </header>

      <section className="homepage-hero" aria-labelledby="homepage-title">
        <h1 id="homepage-title">
          Simplify your <span>agentic workflow</span>
        </h1>
        <p>
          Remove process noise. Plan tasks, generate specs, enforce project standards, and execute templates directly
          from your IDE with documented MCP integrations.
        </p>

        <div className="homepage-hero-actions">
          <button type="button" className="primary-btn" onClick={onRegisterClick}>
            Get Started for Free
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
            {developerSignalRow.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="homepage-features" id="features" aria-label="Product features">
        <div className="section-heading">
          <h2>Designed for clarity</h2>
          <p>Everything needed for agentic delivery, without clutter or enterprise overhead.</p>
        </div>

        <div className="homepage-features-grid">
          {featureCards.map((feature) => (
            <article key={feature.title} className="homepage-feature-card">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="homepage-testimonial" id="testimonial" aria-label="Developer testimonial">
        <img
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
          alt="Developer reviewing task specs at a desk"
          loading="lazy"
        />

        <div className="testimonial-content">
          <p className="stars" aria-hidden="true">
            star star star star star
          </p>
          <blockquote>
            "Trillo keeps exactly what I need in one place: plans, specs, and execution context. I can move from idea to
            shipped code without switching mental models."
          </blockquote>
          <p className="author">Alex Morgan · Indie Developer</p>
        </div>
      </section>

      <section className="homepage-cta" id="start" aria-label="Call to action">
        <h2>Ready to regain your focus?</h2>
        <p>Built for developers who want to ship faster with agentic workflows.</p>
        <div className="homepage-cta-actions">
          <button type="button" className="primary-btn" onClick={onRegisterClick}>
            Get Started
          </button>
          <button type="button" className="ghost-btn" onClick={onLoginClick}>
            Login
          </button>
        </div>
      </section>

      <footer className="homepage-footer" aria-label="Homepage footer">
        <div className="footer-brand">
          <div className="homepage-brand">
            <span className="homepage-brand-mark">T</span>
            <span className="homepage-brand-name">TrilloTask</span>
          </div>
          <p>Minimal task management for developer-first, agentic code workflows.</p>
        </div>

        <nav>
          <h3>Product</h3>
          <ul>
            {productLinks.map((link) => (
              <li key={link}>{link}</li>
            ))}
          </ul>
        </nav>

        <nav>
          <h3>Resources</h3>
          <ul>
            {resourceLinks.map((link) => (
              <li key={link}>{link}</li>
            ))}
          </ul>
        </nav>

        <nav>
          <h3>Developers</h3>
          <ul>
            {developerLinks.map((link) => (
              <li key={link}>{link}</li>
            ))}
          </ul>
        </nav>
      </footer>
    </main>
  );
}
