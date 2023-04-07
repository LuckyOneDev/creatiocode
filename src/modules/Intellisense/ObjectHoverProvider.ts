import * as vscode from 'vscode';
import { IntellisenseHelper } from './IntellisenseHelper';

export class ObjectHoverProvider implements vscode.HoverProvider {
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