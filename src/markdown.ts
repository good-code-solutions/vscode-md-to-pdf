/**
 * Markdown parsing with syntax highlighting and task list support
 */

import * as path from 'path';
import type MarkdownIt from 'markdown-it';

let mdInstance: MarkdownIt | null = null;

/**
 * Get or create a configured markdown-it instance
 */
export function getMarkdownParser(): MarkdownIt {
  if (mdInstance) {
    return mdInstance;
  }

  const MarkdownIt = require('markdown-it');
  const highlightjs = require('markdown-it-highlightjs');

  mdInstance = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: false,
  }).use(highlightjs, { auto: true, code: true, inline: true });

  // Add task list support
  addTaskListPlugin(mdInstance);

  return mdInstance;
}

/**
 * Plugin to render GitHub-style task lists
 */
function addTaskListPlugin(md: MarkdownIt): void {
  const originalRule =
    md.renderer.rules.list_item_open ||
    function (tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.list_item_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const nextToken = tokens[idx + 2];

    if (nextToken?.content) {
      const content = nextToken.content;

      if (content.startsWith('[ ] ')) {
        nextToken.content = content.slice(4);
        token.attrPush(['class', 'task-list-item']);
        return '<li class="task-list-item"><input type="checkbox" disabled> ';
      }

      if (content.startsWith('[x] ') || content.startsWith('[X] ')) {
        nextToken.content = content.slice(4);
        token.attrPush(['class', 'task-list-item task-list-item-checked']);
        return '<li class="task-list-item task-list-item-checked"><input type="checkbox" checked disabled> ';
      }
    }

    return originalRule(tokens, idx, options, env, self);
  };
}

/**
 * Convert relative image paths to absolute file:// URLs
 */
function resolveImagePaths(html: string, basePath: string): string {
  return html.replace(
    /(<img[^>]+src=["'])(?!http|data:|file:)([^"']+)(["'])/gi,
    (_match, prefix, src, suffix) => {
      const absolutePath = path.resolve(basePath, src);
      return `${prefix}file://${absolutePath}${suffix}`;
    }
  );
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render markdown content to HTML
 */
export function renderMarkdownToHtml(
  markdownContent: string,
  title: string,
  basePath: string,
  styles: string
): string {
  const mdParser = getMarkdownParser();
  let htmlContent = mdParser.render(markdownContent);

  // Resolve relative image paths
  htmlContent = resolveImagePaths(htmlContent, basePath);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${styles}</style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
}

