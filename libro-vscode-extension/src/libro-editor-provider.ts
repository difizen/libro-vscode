//@ts-ignore
import * as vscode from 'vscode';

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Provider for libro editors.
 *
 * libro editors are used for `.ipynb` files, which are just json files.
 * To get started, run this extension and open an empty `.ipynb` file in VS Code.
 *
 * This provider demonstrates:
 *
 * - Setting up the initial webview for a custom editor.
 * - Loading scripts and styles in a custom editor.
 * - Synchronizing changes between a text document and a custom editor.
 */
export class LibroNotebookEditorProvider implements vscode.CustomTextEditorProvider {
  private static newNoteBookFileId = 1;
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    vscode.commands.registerCommand('libro.notebook.new', () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage(
          'Creating new notebook files currently requires opening a workspace',
        );
        return;
      }

      const uri = vscode.Uri.joinPath(
        workspaceFolders[0].uri,
        `new-${LibroNotebookEditorProvider.newNoteBookFileId++}.ipynb`,
      ).with({ scheme: 'untitled' });

      vscode.commands.executeCommand('vscode.openWith', uri, LibroNotebookEditorProvider.viewType);
    });
    const provider = new LibroNotebookEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      LibroNotebookEditorProvider.viewType,
      provider,
    );
    return providerRegistration;
  }

  private static readonly viewType = 'libro.notebook';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Called when our custom editor is opened.
   *
   *
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    function updateWebview() {
      webviewPanel.webview.postMessage({
        type: 'update',
        text: document.getText(),
      });
    }

    // Hook up event handlers so that we can synchronize the webview with the text document.
    //
    // The text document acts as our model, so we have to sync change in the document to our
    // editor and sync changes in the editor back to the document.
    //
    // Remember that a single text document can also be shared between multiple custom
    // editors (this happens for example when you split a custom editor)

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e: any) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        updateWebview();
      }
    });

    // Make sure we get rid of the listener when our editor is closed.
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    // // Receive message from the webview.
    webviewPanel.webview.onDidReceiveMessage((e: any) => {
      switch (e.type) {
        case 'update':
          this.updateTextDocument(document, e.content);
          return;
      }
    });

    updateWebview();
  }

  /**
   * Get the static html used for the editor webviews.
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // Local path to script and css for the webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'libro-alex-umd.min.js'),
    );

    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'reset.css'),
    );

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'vscode.css'),
    );

    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'libro-alex-umd.min.css'),
    );

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			</head>
			<body>
			    <div id="libro-vscode">libro</div>
			    <script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }

  /**
   * Try to get a current document as json text.
   */
  private getDocumentAsJson(document: vscode.TextDocument): any {
    const text = document.getText();
    if (text.trim().length === 0) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Could not get document as json. Content is not valid json');
    }
  }

  /**
   * Write out the json to a given document.
   */
  private updateTextDocument(document: vscode.TextDocument, json: any) {
    const edit = new vscode.WorkspaceEdit();

    // Just replace the entire document every time for this extension.
    // A more complete extension should compute minimal edits instead.
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      JSON.stringify(json, null, 2),
    );

    return vscode.workspace.applyEdit(edit);
  }
}
