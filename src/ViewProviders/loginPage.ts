import { CreatioWebViewProvider } from "./common/creatioWebViewProvider";
import * as vscode from 'vscode';
import { ConnectionInfo } from "../api/creatioClient";
import { ConfigHelper } from "../common/configurationHelper";

export class LoginPanelProvider {
    loginPanel?: vscode.WebviewPanel;
    context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    private onDidReceiveMessage(message: any) {
        switch (message.command) {
            case 'login':
                let connectionInfo = message.connectionInfo as ConnectionInfo;
                vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length,
                    {
                        uri: vscode.Uri.parse('creatio:/'),
                        name: connectionInfo.getHostName()
                    }
                );
                break;
            case 'getLoginData':
                return ConfigHelper.getLoginData();
                break;

        }
    }

    public createPanel() {
        this.loginPanel = vscode.window.createWebviewPanel(
            'creatiocode.loginPage',
            'Log in to Creatio',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        this.loginPanel.webview.onDidReceiveMessage(this.onDidReceiveMessage);
        this.loginPanel.webview.html = this.getWebviewContent();
    }

    private getWebviewContent(): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cat Coding</title>
            </head>
            <body>
            </body>
        </html>
        `;
    }
}