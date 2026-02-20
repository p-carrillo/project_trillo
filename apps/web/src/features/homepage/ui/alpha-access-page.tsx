interface AlphaAccessPageProps {
  onBackHomeClick: () => void;
  onLoginClick: () => void;
}

export function AlphaAccessPage({ onBackHomeClick, onLoginClick }: AlphaAccessPageProps) {
  return (
    <main className="homepage alpha-access-page" aria-label="MonoTask alpha access page">
      <header className="homepage-nav">
        <div className="homepage-brand" aria-label="MonoTask">
          <span className="homepage-brand-mark">M</span>
          <span className="homepage-brand-name">MonoTask</span>
        </div>

        <div className="homepage-nav-actions">
          <button type="button" className="homepage-link-muted" onClick={onBackHomeClick}>
            Back to Home
          </button>
          <button type="button" className="primary-btn" onClick={onLoginClick}>
            Login
          </button>
        </div>
      </header>

      <section className="alpha-access-hero" aria-labelledby="alpha-title">
        <p className="alpha-access-kicker">Private Alpha</p>
        <h1 id="alpha-title">MonoTask is currently in private alpha.</h1>
        <p>
          We are onboarding a limited number of developers while we refine the core agentic workflow. If you want
          access, email us and include a short note about your project and toolchain.
        </p>

        <a className="alpha-access-email" href="mailto:hi@diteria.net">
          hi@diteria.net
        </a>

        <p className="alpha-access-note">We review every request and respond with next steps for early access.</p>
      </section>
    </main>
  );
}
