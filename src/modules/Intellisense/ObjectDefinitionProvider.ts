import { type } from 'os';
import * as vscode from 'vscode';
import { IntellisenseHelper } from './IntellisenseHelper';

export class ObjectDefinitionProvider implements vscode.DefinitionProvider {

    private static instance: ObjectDefinitionProvider;
    public static getInstance(): ObjectDefinitionProvider {
        if (!ObjectDefinitionProvider.instance) {
            ObjectDefinitionProvider.instance = new ObjectDefinitionProvider();
        }
        return ObjectDefinitionProvider.instance;
    }

    provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
        const line = document.lineAt(position).text;
        const objectChain = IntellisenseHelper.parseObjectString(line, position.character);
        if (objectChain.length > 0 && IntellisenseHelper.scriptingEnviromentObject) {
            // Check if root object is in env
            if (Object.keys(IntellisenseHelper.scriptingEnviromentObject).includes(objectChain[0])) {
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