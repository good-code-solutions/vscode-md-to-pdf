/**
 * GitHub-style CSS for PDF rendering
 * Optimized for print output with syntax highlighting
 */

export const PDF_STYLES = `
/* ============================================
   CSS Variables - GitHub Light Theme
   ============================================ */

:root {
  --color-fg-default: #24292f;
  --color-fg-muted: #57606a;
  --color-fg-subtle: #6e7781;
  --color-canvas-default: #ffffff;
  --color-canvas-subtle: #f6f8fa;
  --color-border-default: #d0d7de;
  --color-border-muted: #d8dee4;
  --color-accent-fg: #0969da;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  --font-family-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
}

/* ============================================
   Base Styles
   ============================================ */

* { box-sizing: border-box; }

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

body {
  font-family: var(--font-family);
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-fg-default);
  background-color: var(--color-canvas-default);
  word-wrap: break-word;
  max-width: 100%;
  margin: 0;
  padding: 0;
}

/* ============================================
   Headings
   ============================================ */

h1, h2, h3, h4, h5, h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-fg-default);
}

h1 {
  font-size: 2em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--color-border-muted);
}

h2 {
  font-size: 1.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--color-border-muted);
}

h3 { font-size: 1.25em; }
h4 { font-size: 1em; }
h5 { font-size: 0.875em; }
h6 { font-size: 0.85em; color: var(--color-fg-muted); }

h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }

/* ============================================
   Text Elements
   ============================================ */

p {
  margin-top: 0;
  margin-bottom: 16px;
}

b, strong { font-weight: 600; }

a {
  color: var(--color-accent-fg);
  text-decoration: none;
}

a:hover { text-decoration: underline; }

/* ============================================
   Lists
   ============================================ */

ul, ol {
  margin-top: 0;
  margin-bottom: 16px;
  padding-left: 2em;
}

ul ul, ul ol, ol ul, ol ol {
  margin-top: 0;
  margin-bottom: 0;
}

li { margin-top: 0.25em; }
li > p { margin-top: 16px; }
li + li { margin-top: 0.25em; }

/* Task Lists */
.task-list-item {
  list-style-type: none;
  margin-left: -1.5em;
}

.task-list-item input[type="checkbox"] {
  margin-right: 0.5em;
  vertical-align: middle;
}

ul:has(.task-list-item) {
  list-style: none;
  padding-left: 1em;
}

/* ============================================
   Blockquotes
   ============================================ */

blockquote {
  margin: 0 0 16px 0;
  padding: 0 1em;
  color: var(--color-fg-muted);
  border-left: 0.25em solid var(--color-border-default);
}

blockquote > :first-child { margin-top: 0; }
blockquote > :last-child { margin-bottom: 0; }

/* ============================================
   Code Blocks
   ============================================ */

code, tt {
  font-family: var(--font-family-mono);
  font-size: 85%;
  padding: 0.2em 0.4em;
  margin: 0;
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 6px;
  white-space: break-spaces;
}

pre {
  margin-top: 0;
  margin-bottom: 16px;
  padding: 12px;
  overflow-x: hidden;
  font-size: 11px;
  line-height: 1.4;
  background-color: var(--color-canvas-subtle);
  border-radius: 6px;
  word-wrap: normal;
}

pre code {
  display: block;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  background-color: transparent;
  border: 0;
  font-size: 100%;
  white-space: pre;
  overflow-wrap: normal;
  tab-size: 4;
  -moz-tab-size: 4;
  font-variant-ligatures: none;
  text-rendering: optimizeLegibility;
}

/* ============================================
   Syntax Highlighting - GitHub Theme
   ============================================ */

.hljs {
  background: var(--color-canvas-subtle);
  color: var(--color-fg-default);
}

.hljs-doctag,
.hljs-keyword,
.hljs-meta .hljs-keyword,
.hljs-template-tag,
.hljs-template-variable,
.hljs-type,
.hljs-variable.language_ {
  color: #cf222e;
}

.hljs-title,
.hljs-title.class_,
.hljs-title.class_.inherited__,
.hljs-title.function_ {
  color: #8250df;
}

.hljs-attr,
.hljs-attribute,
.hljs-literal,
.hljs-meta,
.hljs-number,
.hljs-operator,
.hljs-selector-attr,
.hljs-selector-class,
.hljs-selector-id,
.hljs-variable {
  color: #0550ae;
}

.hljs-meta .hljs-string,
.hljs-regexp,
.hljs-string {
  color: #0a3069;
}

.hljs-built_in,
.hljs-symbol {
  color: #e36209;
}

.hljs-code,
.hljs-comment,
.hljs-formula {
  color: #6e7781;
}

.hljs-name,
.hljs-quote,
.hljs-selector-pseudo,
.hljs-selector-tag {
  color: #116329;
}

.hljs-subst { color: var(--color-fg-default); }
.hljs-section { color: #0550ae; font-weight: bold; }
.hljs-bullet { color: #953800; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: bold; }
.hljs-addition { color: #116329; background-color: #dafbe1; }
.hljs-deletion { color: #82071e; background-color: #ffebe9; }
.hljs-keyword { font-weight: 500; }

/* ============================================
   Tables
   ============================================ */

table {
  display: table;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  border-spacing: 0;
  border-collapse: collapse;
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 13px;
}

table th {
  font-weight: 600;
  padding: 6px 13px;
  border: 1px solid var(--color-border-default);
  background-color: var(--color-canvas-subtle);
}

table td {
  padding: 6px 13px;
  border: 1px solid var(--color-border-default);
}

table tr {
  background-color: var(--color-canvas-default);
  border-top: 1px solid var(--color-border-muted);
}

table tr:nth-child(2n) {
  background-color: var(--color-canvas-subtle);
}

/* ============================================
   Other Elements
   ============================================ */

hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: var(--color-border-default);
  border: 0;
}

img {
  max-width: 100%;
  box-sizing: content-box;
  background-color: var(--color-canvas-default);
}

kbd {
  display: inline-block;
  padding: 3px 5px;
  font-family: var(--font-family-mono);
  font-size: 11px;
  line-height: 10px;
  color: var(--color-fg-default);
  vertical-align: middle;
  background-color: var(--color-canvas-subtle);
  border: solid 1px var(--color-border-default);
  border-radius: 6px;
  box-shadow: inset 0 -1px 0 var(--color-border-default);
}

/* ============================================
   Print / PDF Optimization
   ============================================ */

@media print {
  body {
    max-width: none !important;
    padding: 0 !important;
    font-size: 11pt;
  }
  
  h1 { font-size: 20pt; }
  h2 { font-size: 16pt; }
  h3 { font-size: 13pt; }
  
  pre {
    white-space: pre;
    word-wrap: normal;
    page-break-inside: avoid;
    border: 1px solid var(--color-border-default);
    font-size: 9px;
    overflow: hidden;
  }
  
  table { page-break-inside: avoid; font-size: 10pt; }
  tr { page-break-inside: avoid; }
  h1, h2, h3, h4, h5, h6 { page-break-after: avoid; page-break-inside: avoid; }
  img { page-break-inside: avoid; page-break-after: avoid; }
  blockquote, pre, table { page-break-inside: avoid; }
  ul, ol { page-break-inside: avoid; }
}
`;

