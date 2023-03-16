import * as vscode from 'vscode';
import { CreatioClient } from '../../creatio-api/CreatioClient';
import { ConfigurationHelper } from '../../common/ConfigurationHelper';
import { GenericWebViewProvider } from '../../common/WebView/GenericWebViewProvider';
import { ConnectionInfo } from '../../creatio-api/ConnectionInfo';
import { CreatioCodeContext } from '../../globalContext';

export class HomeViewProvider extends GenericWebViewProvider {
    scripts = ['homeView.js'];
    styles = ['homeView.css'];

    onDidReceiveMessage = async (message: any) => {
        switch (message.command) {
            case 'login':
                try {
                    let connectionInfo = new ConnectionInfo(message.connectionInfo.url, message.connectionInfo.login, message.connectionInfo.password);
                    ConfigurationHelper.setLoginData(connectionInfo);
                    
                    if (await CreatioCodeContext.tryCreateConnection()) {
                        vscode.commands.executeCommand('creatiocode.reloadCreatioWorkspace');
                    }     
                } catch (error: any) {
                    vscode.window.showErrorMessage(error.message);
                    return error;
                }
                break;
            case 'getLoginData': 
                this.webviewView?.webview.postMessage(ConfigurationHelper.getLoginData() ? ConfigurationHelper.getLoginData() : {});
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