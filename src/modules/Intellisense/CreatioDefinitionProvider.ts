import { type } from 'os';
import * as vscode from 'vscode';
import { IntellisenseHelper } from './IntellisenseHelper';

export class CreatioDefinitionProvider implements vscode.DefinitionProvider {

    private static instance: CreatioDefinitionProvider;
    public static getInstance(): CreatioDefinitionProvider {
        if (!CreatioDefinitionProvider.instance) {
            CreatioDefinitionProvider.instance = new CreatioDefinitionProvider();
        }
        return CreatioDefinitionProvider.instance;
    }

    provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
        const line = document.lineAt(position).text;
        const objectChain = IntellisenseHelper.parseObjectString(line, position.character);
        if (objectChain.length > 0 && IntellisenseHelper.env) {
            // Check if root object is in env
            if (Object.keys(IntellisenseHelper.env).includes(objectChain[0])) {
                return this.getDefinition(objectChain);
            }
        }
        return;
    }

    getDefinition(objectChain: string[]): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
        let definition: vscode.Definition | null = null;
        let object = IntellisenseHelper.getCurrentObject(objectChain);
        
        if (typeof(object) === 'function') {
            definition = new vscode.Location(vscode.Uri.parse('creatio-completion:' + objectChain.join('/')), new vscode.Position(0, 0));
        }

        return definition;
    }
}