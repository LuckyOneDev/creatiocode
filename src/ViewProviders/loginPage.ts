import { CreatioWebViewProvider } from "./common/creatioWebViewProvider";
import * as vscode from 'vscode';
import { ConnectionInfo, CreatioClient } from "../api/creatioClient";
import { ConfigHelper } from "../common/configurationHelper";
import path from "path";

export class LoginPanelProvider {
    loginPanel?: vscode.WebviewPanel;
    context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    private async tryCreateConnection(): Promise<CreatioClient | null> {
        let loginData: ConnectionInfo | undefined = ConfigHelper.getLoginData();
        if (loginData) {
            loginData = new ConnectionInfo(loginData.url, loginData.login, loginData.password);
            let client = new CreatioClient(loginData);
            return await client.login() ? client : null;
        }
        return null;
    }

    private onDidReceiveMessage = async (message: any) => {
        switch (message.command) {
            case 'login':
                try {
                    let connectionInfo = new ConnectionInfo(message.connectionInfo.url, message.connectionInfo.login, message.connectionInfo.password);
                    ConfigHelper.setLoginData(connectionInfo);
                    
                    if (await this.tryCreateConnection()) {
                        vscode.commands.executeCommand('creatiocode.reloadCreatioWorkspace');
                        this.loginPanel?.dispose();
                    }     
                } catch (error: any) {
                    vscode.window.showErrorMessage(error.message);
                    return error;
                }
                break;
            case 'getLoginData': 
                this.loginPanel?.webview.postMessage(ConfigHelper.getLoginData() ? ConfigHelper.getLoginData() : {});
                break;

        }
    };

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

    public getResourcePath(folder: string, fileName: string): vscode.Uri | undefined {
        const scriptPathOnDisk = vscode.Uri.file(path.join(this.context.extensionPath, "resources", folder, fileName));
        return this.loginPanel?.webview.asWebviewUri(scriptPathOnDisk);
    }

    private getWebviewContent(): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
            <script src = '${this.getResourcePath("js", "loginPanel.js")}'></script>
            <style>
                body {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    color: var(--vscode-editor-foreground);
                    font-size: 16px;
                }

                input[type="text"], textarea  {
                    display: flex;
                    margin-bottom: 5px;
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-editor-foreground);
                    border-radius: 3px;
                    color: var(--vscode-editor-foreground);
                    font-size: 16px;
                    width: 250px;
                }

                input[type="button"] {
                    margin-top: 10px;
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-editor-foreground);
                    border-radius: 3px;
                    font-size: 16px;
                    color: var(--vscode-editor-foreground);
                    padding: 5px;
                    width: 250px;
                    text-align: -webkit-center;
                }
            </style>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Connection page</title>
            </head>
            <body>
                <label for="url">Url:</label><br>
                <input type="text" id="url" name="url" value=""><br>
                <label for="login">Login:</label><br>
                <input type="text" id="login" name="login" value=""><br>
                <label for="password">Password:</label><br>
                <input type="text" id="password" name="password" value=""><br>
                <input type="button" id = "confirm" value="Connect">
            </body>
        </html>
        `;
    }
}