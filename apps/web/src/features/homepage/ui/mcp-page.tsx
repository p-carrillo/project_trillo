import { mcpGuide } from '../content/public-docs';

interface McpPageProps {
  onHomeClick: () => void;
  onLoginClick: () => void;
}

export function McpPage({ onHomeClick, onLoginClick }: McpPageProps) {
  return (
    <main className="homepage public-docs-page" aria-label="MonoTask MCP guide">
      <header className="homepage-nav">
        <div className="homepage-nav-inner">
          <div className="homepage-brand" aria-label="MonoTask">
            <span className="homepage-brand-mark">M</span>
            <span className="homepage-brand-name">MonoTask</span>
          </div>

          <div className="homepage-nav-actions">
            <button type="button" className="homepage-link-muted" onClick={onHomeClick}>
              Back to Home
            </button>
            <button type="button" className="primary-btn" onClick={onLoginClick}>
              Login
            </button>
          </div>
        </div>
      </header>

      <section className="public-docs-hero" aria-labelledby="mcp-title">
        <p className="alpha-access-kicker">MCP</p>
        <h1 id="mcp-title">{mcpGuide.title}</h1>
        <p>{mcpGuide.summary}</p>
        <p className="public-docs-meta">Route: /mcp</p>
      </section>

      <section className="public-docs-detail" aria-label="MCP setup instructions">
        <div className="public-docs-section-grid">
          {mcpGuide.sections.map((section) => (
            <article key={section.heading} className="homepage-feature-card">
              <h2>{section.heading}</h2>
              <p>{section.content}</p>
              {section.linkHref && section.linkLabel ? (
                <a href={section.linkHref} className="homepage-link-inline" target="_blank" rel="noreferrer">
                  {section.linkLabel}
                </a>
              ) : null}
              {section.command ? (
                <pre>
                  <code>{section.command}</code>
                </pre>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="homepage-features" aria-label="MCP client setup and tools">
        <div className="public-docs-section-grid">
          <article className="homepage-feature-card">
            <h2>Client config example</h2>
            <p>Use this template in your LLM client MCP settings.</p>
            <pre>
              <code>{mcpGuide.clientConfigExample}</code>
            </pre>
          </article>

          <article className="homepage-feature-card">
            <h2>Available MCP tools</h2>
            <ul>
              {mcpGuide.tools.map((tool) => (
                <li key={tool}>
                  <code>{tool}</code>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
