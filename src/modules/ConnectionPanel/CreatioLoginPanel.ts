import { GenericWebViewProvider } from "../../common/WebView/GenericWebViewProvider";
import * as vscode from 'vscode';
import { CreatioClient } from "../../creatio-api/CreatioClient";
import { ConfigurationHelper } from "../../common/ConfigurationHelper";
import path from "path";
import { CreatioFileSystemProvider } from "../FileSystem/CreatioFileSystemProvider";
import { ConnectionInfo } from "../../creatio-api/ConnectionInfo";
import { CreatioCodeUtils } from "../../common/CreatioCodeUtils";
import { GenericWebViewPanel } from "../../common/WebView/GenericWebViewPanel";
import { CreatioCodeContext } from "../../globalContext";

export class CreatioLoginPanel extends GenericWebViewPanel {
    protected webViewId = "creatiocode.creatioLoginPanel";
    protected title = "Creatio Login";
    
    protected onDidReceiveMessage = async (message: any) => {
        switch (message.command) {
            case 'login':
                try {
                    let connectionInfo = new ConnectionInfo(message.connectionInfo.url, message.connectionInfo.login, message.connectionInfo.password);
                    if (connectionInfo.getHostName() === '') {
                        vscode.window.showErrorMessage("Unable to parse url. Example: http://localhost:81");
                    } else if (connectionInfo.getProtocol() !== 'http' || connectionInfo.getProtocol() !== 'https') {
                        vscode.window.showErrorMessage("Unsupported protocol");
                    }

                    ConfigurationHelper.setLoginData(connectionInfo);

                    if (await CreatioCodeContext.tryCreateConnection()) {
                        CreatioCodeContext.reloadWorkSpace();
                        this.dispose();
                    }
                } catch (error: any) {
                    vscode.window.showErrorMessage(error.message);
                    return error;
                }
                break;
            case 'getLoginData':
                this.postMessage(ConfigurationHelper.getLoginData() ? ConfigurationHelper.getLoginData() : {});
                break;

        }
    };

    protected getWebviewContent(): string {
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