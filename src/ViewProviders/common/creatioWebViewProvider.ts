import path from 'path';
import * as vscode from 'vscode';

export abstract class CreatioWebViewProvider implements vscode.WebviewViewProvider {
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  context: vscode.ExtensionContext;
  protected webviewView?: vscode.WebviewView;
  protected onDidReceiveMessage(message: any): void {};
  protected postMessage(message: any) {
    if (this.webviewView) {
      this.webviewView.webview.postMessage(message);
    }
  }
  protected styles: Array<string> = [];
  protected scripts: Array<string> = [];

  private getResourcesHtml(): string {
    return this.getStylesHtml() + this.getScriptsHtml();
  }

  private getStylesHtml(): string {
    let result = '';
    this.styles.forEach(style => {
      if (this.webviewView) {
        const stylePathOnDisk = vscode.Uri.file(path.join(this.context.extensionPath, "resources", "css", style));
        result += `<link rel="stylesheet" href="${this.webviewView?.webview.asWebviewUri(stylePathOnDisk)}">\n`;
      }
    });
    return result;
  }

  private getScriptsHtml(): string {
    let result = '';
    this.scripts.forEach(script => {
      if (this.webviewView) {
        const scriptPathOnDisk = vscode.Uri.file(path.join(this.context.extensionPath, "resources", "js", script));
        result += `<script src="${this.webviewView?.webview.asWebviewUri(scriptPathOnDisk)}"></script>\n`;
      }
    });
    return result;
  }

  protected abstract getBody(): string;

  protected getHtml(): string {
    return `<html><head>${this.getResourcesHtml()}<body>${this.getBody()}</body></html>`;
  }
  
  protected reloadWebview() {
    if (this.webviewView) {
      this.webviewView.webview.options = { enableScripts: true };
      this.webviewView.webview.html = this.getHtml();
    }
  }

  public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
    this.webviewView = webviewView;
    this.webviewView.webview.onDidReceiveMessage(this.onDidReceiveMessage);
    this.webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, 'resources'))
      ]
    };
    webviewView.webview.html = this.getHtml();
  }

}