import { type } from 'os';
import * as vscode from 'vscode';
import { CreatioCodeContext } from '../../globalContext';
import { IntellisenseHelper } from './IntellisenseHelper';

export class ObjectDefinitionProvider implements vscode.DefinitionProvider {
    
    async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Definition | vscode.LocationLink[] | null> {
        const line = document.lineAt(position).text;
        const objectChain = IntellisenseHelper.parseObjectString(line, position.character);
        if (objectChain.length > 0) {
            let result: vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]>;
            result = await this.getDefinitionFromParents(document.uri, objectChain[objectChain.length - 1]);
            if (result) {
                return result;
            }

            // Check if root object is in env
            if (Object.keys(IntellisenseHelper.scriptingEnviromentObject).includes(objectChain[0])) {
                
                // result = this.getDefinitionFromDynamicLoad(objectChain);
                // if (result) {
                //     return result;
                // }
            }
        }
        return null;
    }

    async getDefinitionFromParents(documentUri: vscode.Uri, methodName: string): Promise<vscode.Definition | vscode.LocationLink[] | null> {
        let definitions: vscode.Location[] = [];

        let chain = await CreatioCodeContext.creatioFileRelationProvider.getMethodsInheritanceChain(documentUri, new vscode.CancellationTokenSource().token);
        if (!chain) {
            return null;
        }
        Object.entries(chain).forEach(entry => {
            const moduleUri = entry[0];
            const methods = entry[1];
            methods.forEach(method => {
                if (method.name === methodName && method.location?.start) {
                    definitions.push(new vscode.Location(vscode.Uri.parse(moduleUri), new vscode.Position(method.location.start.line, method.location.start.column)));
                }
            });
        });
        return definitions;
    }

    getDefinitionFromDynamicLoad(objectChain: string[]): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
        let definition: vscode.Definition | null = null;
        let object = IntellisenseHelper.getCurrentObject(objectChain);
        
        if (typeof(object) === 'function') {
            definition = new vscode.Location(vscode.Uri.parse('creatio-completion:' + object.toString()), new vscode.Position(0, 0));
        }

        return definition;
    }
}