/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { IntellisenseHelper } from './IntellisenseHelper';
import { ScriptFetcher } from './ScriptFetcher';

export class CreatioCompletionItemProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
    private static instance: CreatioCompletionItemProvider;
    public static getInstance(): CreatioCompletionItemProvider {
        if (!CreatioCompletionItemProvider.instance) {
            CreatioCompletionItemProvider.instance = new CreatioCompletionItemProvider();
        }
        return CreatioCompletionItemProvider.instance;
    }

    getParamNames(functionText: string): string[] {
        const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        const ARGUMENT_NAMES = /([^\s,]+)/g;

        var fnStr = functionText.replace(STRIP_COMMENTS, '');
        var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);

        return result ? result : [];
    }

      
    getCompletionItems(objectChain: string[]): vscode.CompletionItem[] {
        const completionItems: vscode.CompletionItem[] = [];
        let object = IntellisenseHelper.getCurrentObject(objectChain);
        if (object) {
            if (typeof(object) === 'string') {
                return completionItems;
            }

            Object.entries(object).forEach((entry) => {
                const key = entry[0];
                const value = entry[1];
                const completionItem = new vscode.CompletionItem(key);
                completionItem.kind = IntellisenseHelper.mapJsTypeToCompletionItemKind(typeof(value));
                
                switch (typeof(value)) {
                    case 'object':
                        if (value !== null) {completionItem.documentation = value.toString();}
                        break;
                    case 'string':
                        completionItem.documentation = value;
                        break;
                    case 'number':
                    case 'boolean':
                    case 'bigint':
                    case 'symbol':
                        completionItem.documentation = value.toString();
                        break;
                    case 'function':
                        completionItem.documentation = value.toString();
                        completionItem.insertText = key + `(${this.getParamNames(value.toString()).join(',')});`;
                        break;
                    case 'undefined':
                        break;
                    default:
                        completionItem.documentation = value!.toString();
                        break;
                }
                
                completionItems.push(completionItem);
            });
        }
        return completionItems;
    }



    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext):  vscode.CompletionItem[] { 
        const line = document.lineAt(position).text;
        const objectChain = IntellisenseHelper.parseObjectString(line.substring(0, position.character - 1), position.character - 2);
        
        if (objectChain.length > 0 && IntellisenseHelper.scriptingEnviromentObject) {
            // Check if root object is in env
            if (Object.keys(IntellisenseHelper.scriptingEnviromentObject).includes(objectChain[0])) {
                return this.getCompletionItems(objectChain);
            }
        }

        return [];
    }
}