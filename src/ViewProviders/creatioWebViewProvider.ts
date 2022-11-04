import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CreatioFS } from '../fileSystemProvider';
import { Schema, WorkSpaceItem } from '../api/creatioInterfaces';

export abstract class CreatioWebViewProvider implements vscode.WebviewViewProvider {
  protected webviewView?: vscode.WebviewView;

  protected abstract getStyles(): string;
  protected abstract getBody(): string;
  
  protected getHtml(): string {
    return `
    <html>
    <head><style>${this.getStyles()}</style></head>
    <body>${this.getBody()}</body>
    </html>`;
  }
  
  protected reloadWebview() {
    if (this.webviewView) {
      this.webviewView.webview.options = { enableScripts: true };
      this.webviewView.webview.html = this.getHtml();
    }
  }

  public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml();
    this.webviewView = webviewView;
  }
}