import { CreatioWebViewProvider } from "./common/creatioWebViewProvider";
import * as vscode from 'vscode';
import { ConnectionInfo, CreatioClient } from "../api/creatioClient";
import { ConfigHelper } from "../common/configurationHelper";
import path from "path";
import { CreatioFS } from "./fs/fileSystemProvider";

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

                        await vscode.commands.executeCommand('creatiocode.reloadCreatioWorkspace');
                        await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(CreatioFS.getInstance().fsHelper.getDataFolder()), false);
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
                <script src = '${this.getResourcePath("js", "homeView.js")}'></script>
                <link rel="stylesheet" href="${this.getResourcePath("css", "homeView.css")}">
                <title>Connection page</title>
            </head>
            <body>
                <label for="url">Url:</label>
                <input type="text" id="url" name="url" value="">
                <label for="login">Login:</label>
                <input type="text" id="login" name="login" value="">
                <label for="password">Password:</label>
                <input type="text" id="password" name="password" value="">
                <input type="button" id = "connect" value="Connect">
            </body>
        </html>
        `;
    }
}