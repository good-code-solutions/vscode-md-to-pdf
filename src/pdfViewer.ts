import * as vscode from 'vscode';
import * as path from 'path';

export class PdfViewerProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = 'md-to-pdf.viewer';

  constructor(private readonly _extensionUri: vscode.Uri) { }

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new PdfViewerProvider(context.extensionUri);
    return vscode.window.registerCustomEditorProvider(
      PdfViewerProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  async openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
    token: vscode.CancellationToken
  ): Promise<vscode.CustomDocument> {
    return {
      uri,
      dispose: () => { },
    };
  }

  async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'out', 'pdfjs'),
        vscode.Uri.file(path.dirname(document.uri.fsPath)),
      ],
    };

    webviewPanel.webview.html = this._getHtmlForWebview(webviewPanel.webview, document.uri);
  }

  private _getHtmlForWebview(webview: vscode.Webview, pdfUri: vscode.Uri) {
    // Get paths to resources
    const pdfJsPath = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'pdfjs', 'pdf.min.mjs'));
    const pdfWorkerPath = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'pdfjs', 'pdf.worker.min.mjs'));
    const pdfWebviewUri = webview.asWebviewUri(pdfUri);

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PDF Viewer</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #525659;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        #pdf-container {
          width: 100%;
          max-width: 1000px;
          padding: 20px;
          box-sizing: border-box;
        }
        .pdf-page {
          margin-bottom: 20px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          background-color: white;
        }
        canvas {
          display: block;
          width: 100%;
          height: auto;
        }
      </style>
    </head>
    <body>
      <div id="pdf-container"></div>
      <script type="module">
        import * as pdfjsLib from '${pdfJsPath}';

        pdfjsLib.GlobalWorkerOptions.workerSrc = '${pdfWorkerPath}';

        const url = '${pdfWebviewUri}';
        const container = document.getElementById('pdf-container');

        async function renderPdf() {
          try {
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              const page = await pdf.getPage(pageNum);
              const scale = 1.5;
              const viewport = page.getViewport({ scale });

              const canvas = document.createElement('canvas');
              canvas.className = 'pdf-page';
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              container.appendChild(canvas);

              const renderContext = {
                canvasContext: context,
                viewport: viewport
              };
              page.render(renderContext);
            }
          } catch (error) {
            console.error('Error rendering PDF:', error);
            container.innerHTML = '<p style="color: white; text-align: center;">Error loading PDF: ' + error.message + '</p>';
          }
        }

        renderPdf();
      </script>
    </body>
    </html>`;
  }
}
