import path from 'path';
import * as vscode from 'vscode';

export abstract class CreatioWebViewProvider implements vscode.WebviewViewProvider {
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }
  protected webviewView?: vscode.WebviewView;

  protected abstract getStyles(): string;
  protected abstract getBody(): string;
  protected abstract onDidReceiveMessage(message: any): void;
  protected abstract getScripts(): Array<string>;

  protected getLoaderCSS() {
    return `
    .loader {
      display: block;
      margin-left: auto;
      margin-right: auto;
      width: 48px;
      height: 48px;
      border: 5px solid white;
      border-bottom-color: transparent;
      border-radius: 50%;
      box-sizing: border-box;
      animation: rotation 1s linear infinite;
    }
  
    @keyframes rotation {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
    }`;
  }

  private getScriptsHtml(): string {
    let result = '';
    this.getScripts().forEach(script => {
      const scriptPathOnDisk = vscode.Uri.joinPath(this.context.extensionUri, script);
      result += `<script src="${this.webviewView?.webview.asWebviewUri(scriptPathOnDisk)}"></script>`;
    });
    return result;
  }

  protected getHtml(): string {
    return `<html><head><style>${this.getStyles()}</style>${this.getScriptsHtml()}</head><body>${this.getBody()}</body></html>`;
  }
  
  protected reloadWebview() {
    if (this.webviewView) {
      this.webviewView.webview.options = { enableScripts: true };
      this.webviewView.webview.html = this.getHtml();
      this.webviewView.webview.postMessage({ command: 'reload' });
    }
  }
  
  public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml();
    this.webviewView = webviewView;
    this.webviewView.webview.onDidReceiveMessage((message) => {
            this.onDidReceiveMessage(message);
    });
  }
  
}