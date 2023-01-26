/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { ScriptFetcher } from './ScriptFetcher';

export class CreatioCompletionItemProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
    env?: { Terrasoft: any; Ext: any; };

    private static instance: CreatioCompletionItemProvider;
    public static getInstance(): CreatioCompletionItemProvider {
        if (!CreatioCompletionItemProvider.instance) {
            CreatioCompletionItemProvider.instance = new CreatioCompletionItemProvider();
        }
        return CreatioCompletionItemProvider.instance;
    }

    async init() {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title: "Loading advanced intellisense",
            },
            async (progress, token) => {
                progress.report({
                    message: "Loading scripts",
                    increment: 0
                });
                this.env = await ScriptFetcher.getScriptEnviroment();
            }
        );
    }

    getCompletionItems(objectChain: string[]): vscode.CompletionItem[] {
        const completionItems: vscode.CompletionItem[] = [];
        let currentObject: any = this.env;
        for (let i = 0; i < objectChain.length && currentObject; i++) {
            const nextObj = objectChain[i];
            currentObject = currentObject[nextObj];
        }
        if (currentObject) {
            Object.entries(currentObject).forEach((entry) => {
                const key = entry[0];
                const value = entry[1];
                const completionItem = new vscode.CompletionItem(key);
                completionItem.kind = this.mapJsTypeToCompletionItemKind(typeof(value));
                completionItem.documentation = "Dynamically loaded from server";
                completionItem.preselect = true;
                completionItems.push(completionItem);
            });
        }
        return completionItems;
    }

    private mapJsTypeToCompletionItemKind(type: string): vscode.CompletionItemKind {
        switch (type) {
            case 'string':
                return vscode.CompletionItemKind.Property;
            case 'number':
                return vscode.CompletionItemKind.Property;
            case 'boolean':
                return vscode.CompletionItemKind.Property;
            case 'function':
                return vscode.CompletionItemKind.Method;
            case 'object':
                return vscode.CompletionItemKind.Class;
            default:
                return vscode.CompletionItemKind.Text;
        }
    }

    private parseObjectString(objectString: string): string[] {
        let newString = objectString.trim();
        newString = newString.split("").reverse().join("");
        newString = newString.slice(0, newString.indexOf(' ') !== -1 ? newString.indexOf(' ') : newString.length);
        newString = newString.split("").reverse().join("");
        return newString.split('.').filter(x => x.length > 0);
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext):  vscode.CompletionItem[] { 
        const objectChain = this.parseObjectString(document.lineAt(position).text.substring(0, position.character));
        
        if (objectChain.length > 0 && this.env) {
            // Check if root object is in env
            if (Object.keys(this.env).includes(objectChain[0])) {
                return this.getCompletionItems(objectChain);
            }
        }

        return [];
    }
}