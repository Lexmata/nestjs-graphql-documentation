export const BUILT_IN_CSS = `/* nestjs-graphql-documentation built-in CSS */
.ngd-layout { display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }
.ngd-sidebar { border-right: 1px solid var(--pico-muted-border-color); padding: 1rem; position: sticky; top: 0; align-self: start; max-height: 100vh; overflow-y: auto; }
.ngd-main { padding: 1.5rem 2rem; }
.ngd-search { width: 100%; margin-bottom: 1rem; }
.ngd-nav-group { margin-bottom: 1rem; }
.ngd-nav-group > h4 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.65; margin: 0 0 0.25rem 0; }
.ngd-nav-group ul { list-style: none; padding: 0; margin: 0; }
.ngd-nav-group li a { display: block; padding: 0.15rem 0.5rem; border-radius: 4px; text-decoration: none; color: inherit; font-size: 0.9rem; }
.ngd-nav-group li a:hover { background: var(--pico-secondary-background); }
.ngd-nav-group li a.is-active { background: var(--pico-primary-background); color: var(--pico-primary-inverse); }
.ngd-hidden { display: none !important; }
.ngd-deprecated { display: inline-block; padding: 0 0.4rem; border-radius: 3px; background: var(--pico-del-color, #b00); color: white; font-size: 0.75rem; margin-left: 0.5rem; vertical-align: middle; }
.ngd-tag { display: inline-block; padding: 0 0.4rem; border-radius: 3px; background: var(--pico-secondary-background); font-size: 0.75rem; margin-right: 0.25rem; }
.ngd-type { font-family: var(--pico-font-family-monospace); color: var(--pico-primary); }
.ngd-args-table th, .ngd-args-table td { padding: 0.25rem 0.5rem; vertical-align: top; font-size: 0.9rem; }
.ngd-banner { padding: 0.75rem 1rem; border-radius: 6px; background: #fdecea; color: #611a15; margin: 1rem 0; }
@media (max-width: 800px) {
  .ngd-layout { grid-template-columns: 1fr; }
  .ngd-sidebar { position: static; border-right: none; border-bottom: 1px solid var(--pico-muted-border-color); max-height: 40vh; }
}
`;

export function renderCss(customCss?: string): string {
  if (!customCss) return BUILT_IN_CSS;
  return BUILT_IN_CSS + customCss;
}
