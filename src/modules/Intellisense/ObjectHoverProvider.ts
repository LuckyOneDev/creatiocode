import * as vscode from 'vscode';
import { IntellisenseHelper } from './IntellisenseHelper';

export class ObjectHoverProvider implements vscode.HoverProvider {
    private static instance: ObjectHoverProvider;
    public static getInstance(): ObjectHoverProvider {
        if (!ObjectHoverProvider.instance) {
            ObjectHoverProvider.instance = new ObjectHoverProvider();
        }
        return ObjectHoverProvider.instance;
    }

    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        const line = document.lineAt(position).text;
        const objectChain = IntellisenseHelper.parseObjectString(line, position.character);
        if (objectChain.length > 0 && IntellisenseHelper.scriptingEnviromentObject) {
            // Check if root object is in env
            if (Object.keys(IntellisenseHelper.scriptingEnviromentObject).includes(objectChain[0])) {
                return new vscode.Hover(IntellisenseHelper.getCurrentObject(objectChain).toString());
            }
        }
        return;
    }
}