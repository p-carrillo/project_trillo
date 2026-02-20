import { footerLinkGroups, publicDocs, type PublicDocEntry } from '../content/public-docs';

interface PublicDocsPageProps {
  entry: PublicDocEntry | null;
  onHomeClick: () => void;
  onLoginClick: () => void;
  onDocClick: (slug: string) => void;
}

export function PublicDocsPage({ entry, onHomeClick, onLoginClick, onDocClick }: PublicDocsPageProps) {
  return (
    <main className="homepage public-docs-page" aria-label="MonoTask public documentation">
      <header className="homepage-nav">
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
      </header>

      <section className="public-docs-hero" aria-labelledby="docs-title">
        <nav className="public-docs-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <a
                href="/"
                onClick={(event) => {
                  event.preventDefault();
                  onHomeClick();
                }}
              >
                Home
              </a>
            </li>
            {entry ? (
              <li>
                <a
                  href={createDocPath('docs')}
                  onClick={(event) => {
                    event.preventDefault();
                    onDocClick('docs');
                  }}
                >
                  Docs
                </a>
              </li>
            ) : (
              <li>
                <span aria-current="page">Docs</span>
              </li>
            )}
            {entry ? (
              <li>
                <span aria-current="page">{entry.title}</span>
              </li>
            ) : null}
          </ol>
        </nav>

        <p className="alpha-access-kicker">Public Documentation</p>
        <h1 id="docs-title">{entry ? entry.title : 'Documentation Index'}</h1>
        <p>
          {entry
            ? entry.summary
            : 'Explore each public element currently exposed on the homepage and footer, including roadmap notes.'}
        </p>
        <p className="public-docs-meta">
          {entry ? `${entry.category} | ${entry.availability}` : 'Agentic mode is planned and listed in the roadmap.'}
        </p>
      </section>

      {entry ? (
        <section className="public-docs-detail" aria-label={`${entry.title} documentation details`}>
          <div className="public-docs-section-grid">
            {entry.sections.map((section) => (
              <article key={section.heading} className="homepage-feature-card">
                <h2>{section.heading}</h2>
                <p>{section.content}</p>
              </article>
            ))}
          </div>
          <button
            type="button"
            className="homepage-demo-btn public-docs-back-btn"
            onClick={() => onDocClick('docs')}
          >
            Open docs index
          </button>
        </section>
      ) : (
        <section className="homepage-features public-docs-index" aria-label="Public documentation index">
          <div className="section-heading">
            <h2>Browse by area</h2>
            <p>Every footer and homepage reference is now documented with a dedicated public page.</p>
          </div>

          <div className="public-docs-groups">
            {footerLinkGroups.map((group) => (
              <article key={group.heading} className="public-docs-group">
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
              </article>
            ))}
          </div>

          <div className="public-docs-cards">
            {publicDocs.map((doc) => (
              <article key={doc.slug} className="homepage-feature-card">
                <p className="public-docs-card-meta">
                  {doc.category} | {doc.availability}
                </p>
                <h3>{doc.title}</h3>
                <p>{doc.summary}</p>
                <a
                  href={createDocPath(doc.slug)}
                  className="homepage-demo-btn public-docs-card-link"
                  onClick={(event) => {
                    event.preventDefault();
                    onDocClick(doc.slug);
                  }}
                >
                  Open page
                </a>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function createDocPath(slug: string): string {
  if (slug === 'docs') {
    return '/docs';
  }

  return `/docs/${encodeURIComponent(slug)}`;
}
