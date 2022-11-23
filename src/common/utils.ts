import * as vscode from 'vscode';

export class CreatioCodeUtils {
    static createReconnectDialouge(callbackYes: () => void  = () => {}, callbackNo: () => void = () => {}) {
        vscode.window.showErrorMessage("Client is not connected. Reconnect?", "Reconnect").then((value) => {
            if (value === "Reconnect") {
                vscode.commands.executeCommand("creatiocode.reloadCreatioWorkspace");
                callbackYes();
            } else {
                callbackNo();
            }
        });
    }

    static createYesNoDialouge(text: string, yesCallback: () => void, noCallback: () => void = () => {}) {
        vscode.window.showInformationMessage(text, "Yes", "No").then((value) => {
            if (value === "Yes") {
                yesCallback();
            } else {
                noCallback();
            }
        });
    }
}