import * as vscode from 'vscode';
import { CreatioCodeContext } from '../globalContext';

export class CreatioCodeUtils {
    static async closeFileIfOpen(file:vscode.Uri) : Promise<void> {
        const tabs: vscode.Tab[] = vscode.window.tabGroups.all.map(tg => tg.tabs).flat();
        const index = tabs.findIndex(tab => tab.input instanceof vscode.TabInputText && tab.input.uri.path === file.path);
        if (index !== -1) {
            await vscode.window.tabGroups.close(tabs[index]);
        }
    }

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