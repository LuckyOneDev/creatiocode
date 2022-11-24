import * as vscode from 'vscode';
import { ConnectionInfo, CreatioClient } from '../api/creatioClient';
import { ConfigHelper } from '../common/configurationHelper';
import { CreatioWebViewProvider } from './common/creatioWebViewProvider';

export class HomeViewProvider extends CreatioWebViewProvider {
    scripts = ['homeView.js'];
    styles = ['homeView.css'];

    private async tryCreateConnection(): Promise<CreatioClient | null> {
        let loginData: ConnectionInfo | undefined = ConfigHelper.getLoginData();
        if (loginData) {
            loginData = new ConnectionInfo(loginData.url, loginData.login, loginData.password);
            let client = new CreatioClient(loginData);
            return await client.login() ? client : null;
        }
        return null;
    }
    
    onDidReceiveMessage = async (message: any) => {
        switch (message.command) {
            case 'login':
                try {
                    let connectionInfo = new ConnectionInfo(message.connectionInfo.url, message.connectionInfo.login, message.connectionInfo.password);
                    ConfigHelper.setLoginData(connectionInfo);
                    
                    if (await this.tryCreateConnection()) {
                        vscode.commands.executeCommand('creatiocode.reloadCreatioWorkspace');
                    }     
                } catch (error: any) {
                    vscode.window.showErrorMessage(error.message);
                    return error;
                }
                break;
            case 'getLoginData': 
                this.webviewView?.webview.postMessage(ConfigHelper.getLoginData() ? ConfigHelper.getLoginData() : {});
                break;
            case 'reload': 
                vscode.commands.executeCommand('creatiocode.reloadCreatioWorkspace');
                break;
        }
    };

    protected getBody(): string {
        return `<label for="url">Url:</label>
        <input type="text" id="url" name="url" value="">
        <label for="login">Login:</label>
        <input type="text" id="login" name="login" value="">
        <label for="password">Password:</label>
        <input type="text" id="password" name="password" value="">
        <input type="button" id = "connect" value="Connect">
        <input type="button" id = "reload" value="Reload">
        `;
    }

}