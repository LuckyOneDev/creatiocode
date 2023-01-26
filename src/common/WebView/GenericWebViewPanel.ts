import path from 'path';
import * as vscode from 'vscode';

export abstract class GenericWebViewPanel {
    private panel?: vscode.WebviewPanel;
    protected context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    protected abstract onDidReceiveMessage: ((message: any) => Promise<void>);
    protected abstract getWebviewContent(): string;
    protected abstract webViewId: string;
    protected abstract title: string;

    public createPanel() {
        this.panel = vscode.window.createWebviewPanel(
            this.webViewId,
            this.title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.onDidReceiveMessage(this.onDidReceiveMessage);
        this.panel.webview.html = this.getWebviewContent();
    }

    protected getResourcePath(folder: string, fileName: string): vscode.Uri | undefined {
        const fileSystemPath = vscode.Uri.file(path.join(this.context.extensionPath, "resources", folder, fileName));
        return this.panel?.webview.asWebviewUri(fileSystemPath);
    }

    protected postMessage(message: any) : Thenable<boolean> | undefined {
        return this.panel?.webview.postMessage(message);
    }

    protected dispose() {
        this.panel?.dispose();
    }
}