import * as vscode from 'vscode';
import { IntellisenseHelper } from './IntellisenseHelper';

export class CreatioHoverProvider implements vscode.HoverProvider {
    private static instance: CreatioHoverProvider;
    public static getInstance(): CreatioHoverProvider {
        if (!CreatioHoverProvider.instance) {
            CreatioHoverProvider.instance = new CreatioHoverProvider();
        }
        return CreatioHoverProvider.instance;
    }

    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        const line = document.lineAt(position).text;
        const objectChain = IntellisenseHelper.parseObjectString(line, position.character);
        if (objectChain.length > 0 && IntellisenseHelper.env) {
            // Check if root object is in env
            if (Object.keys(IntellisenseHelper.env).includes(objectChain[0])) {
                return new vscode.Hover(IntellisenseHelper.getCurrentObject(objectChain).toString());
            }
        }
        return;
    }
}