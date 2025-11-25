/**
 * Markdown parsing with syntax highlighting and task list support
 */

import * as path from 'path';
import type MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import shell from 'highlight.js/lib/languages/shell';
import yaml from 'highlight.js/lib/languages/yaml';
import sql from 'highlight.js/lib/languages/sql';
import ini from 'highlight.js/lib/languages/ini';
import markdown from 'highlight.js/lib/languages/markdown';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', shell);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('ini', ini);
hljs.registerLanguage('markdown', markdown);

let mdInstance: MarkdownIt | null = null;

/**
 * Get or create a configured markdown-it instance
 */
export function getMarkdownParser(): MarkdownIt {
  if (mdInstance) {
    return mdInstance;
  }

  const MarkdownIt = require('markdown-it');

  mdInstance = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: false,
    highlight: function (str: string, lang: string): string {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return '<pre class="hljs"><code>' +
            hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
            '</code></pre>';
        } catch (__) { }
      }

      return '<pre class="hljs"><code>' + mdInstance!.utils.escapeHtml(str) + '</code></pre>';
    }
  });

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
    function (tokens: any[], idx: number, options: any, _env: any, self: any) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.list_item_open = function (tokens: any[], idx: number, options: any, env: any, self: any) {
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

