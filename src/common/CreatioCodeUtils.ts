import * as vscode from 'vscode';
import { CreatioCodeContext } from '../globalContext';

export class CreatioCodeUtils {
    static createReconnectDialouge<T>(callbackYes: () => Promise<T | null>, callbackNo: () => Promise<T | null> = async () => { return null; }): Promise<T | null> {
        return new Promise((resolve) => {
            vscode.window.showInformationMessage("Client is not connected. Reconnect?", "Reconnect").then(async value => {
                if (value === "Reconnect") {
                    await CreatioCodeContext.reloadWorkSpace();
                    resolve(callbackYes());
                } else {
                    return callbackNo();
                }
            });
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