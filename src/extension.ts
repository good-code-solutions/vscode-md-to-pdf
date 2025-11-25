/**
 * MD to PDF - Blazing Fast
 * VS Code extension to convert Markdown files to PDF
 *
 * @author MD to PDF
 * @license MIT
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { PDF_STYLES } from './styles';
import { getBrowser, closeBrowser } from './browser';
import { renderMarkdownToHtml } from './markdown';

// ============================================
// Types
// ============================================

interface PdfMargins {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

type PageFormat = 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5';

// ============================================
// Configuration
// ============================================

const DEFAULT_MARGINS: PdfMargins = {
  top: '15mm',
  right: '15mm',
  bottom: '15mm',
  left: '15mm',
};

function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('md-to-pdf');
}

// ============================================
// PDF Conversion
// ============================================

/**
 * Convert HTML content to PDF file
 */
async function convertHtmlToPdf(
  htmlContent: string,
  outputPath: string,
  format: PageFormat,
  margins: PdfMargins
): Promise<void> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await page.pdf({
      path: outputPath,
      format,
      margin: margins,
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });
  } finally {
    await page.close();
  }
}

/**
 * Main conversion command handler
 */
async function convertMarkdownToPdf(uri?: vscode.Uri): Promise<void> {
  // Determine the file to convert
  let fileUri = uri;

  if (!fileUri) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No Markdown file is open');
      return;
    }
    fileUri = editor.document.uri;
  }

  // Validate file type
  const filePath = fileUri.fsPath;
  if (!filePath.toLowerCase().endsWith('.md')) {
    vscode.window.showErrorMessage('This command only works with Markdown (.md) files');
    return;
  }

  // Get configuration
  const config = getConfig();
  const format = config.get<PageFormat>('pageFormat', 'A4');
  const margins = config.get<PdfMargins>('margins', DEFAULT_MARGINS);
  const openAfterConversion = config.get<boolean>('openAfterConversion', true);

  // Prepare paths
  const pdfPath = filePath.replace(/\.md$/i, '.pdf');
  const fileName = path.basename(filePath);
  const basePath = path.dirname(filePath);
  const title = path.basename(filePath, '.md');

  // Convert with progress indicator
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Converting ${fileName} to PDF...`,
      cancellable: false,
    },
    async (progress) => {
      const startTime = Date.now();

      try {
        progress.report({ increment: 20, message: 'Reading file...' });

        // Read markdown content
        const markdownContent = fs.readFileSync(filePath, 'utf-8');

        progress.report({ increment: 30, message: 'Generating HTML...' });

        // Convert to HTML
        const htmlContent = renderMarkdownToHtml(markdownContent, title, basePath, PDF_STYLES);

        progress.report({ increment: 30, message: 'Creating PDF...' });

        // Generate PDF
        await convertHtmlToPdf(htmlContent, pdfPath, format, margins);

        progress.report({ increment: 20, message: 'Done!' });

        // Show success message
        const duration = Date.now() - startTime;
        const pdfFileName = path.basename(pdfPath);

        const action = await vscode.window.showInformationMessage(
          `✅ ${pdfFileName} created in ${duration}ms`,
          'Open PDF',
          'Reveal in Finder'
        );

        // Handle user action
        if (action === 'Open PDF') {
          await vscode.env.openExternal(vscode.Uri.file(pdfPath));
        } else if (action === 'Reveal in Finder') {
          await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(pdfPath));
        } else if (openAfterConversion) {
          await vscode.env.openExternal(vscode.Uri.file(pdfPath));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to convert: ${message}`);
        console.error('MD to PDF conversion error:', error);
      }
    }
  );
}

// ============================================
// Status Bar
// ============================================

let statusBarItem: vscode.StatusBarItem;

function updateStatusBar(editor: vscode.TextEditor | undefined): void {
  if (editor?.document.languageId === 'markdown') {
    statusBarItem.text = '$(file-pdf) PDF';
    statusBarItem.tooltip = 'Convert Markdown to PDF (Cmd+Alt+P)';
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}

// ============================================
// Extension Lifecycle
// ============================================

export function activate(context: vscode.ExtensionContext): void {
  // Register conversion command
  const convertCommand = vscode.commands.registerCommand('md-to-pdf.convert', convertMarkdownToPdf);
  context.subscriptions.push(convertCommand);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'md-to-pdf.convert';
  context.subscriptions.push(statusBarItem);

  // Listen for editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar)
  );

  // Initialize status bar
  updateStatusBar(vscode.window.activeTextEditor);

  console.log('MD to PDF extension activated');
}

export function deactivate(): void {
  closeBrowser().catch(console.error);
}
