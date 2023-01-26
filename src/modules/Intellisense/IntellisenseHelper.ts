import * as vscode from 'vscode';
import { ScriptFetcher } from './ScriptFetcher';

export class IntellisenseHelper {
    public static env: any;
    public static init() {
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
                this.env =  
                {
                    "this" : await ScriptFetcher.getScriptEnviroment()
                };
            }
        );
    }

    public static mapJsTypeToCompletionItemKind(type: string): vscode.CompletionItemKind {
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

    public static getCurrentObject(objectChain: string[]) {
        let currentObject: any = IntellisenseHelper.env;
        for (let i = 0; i < objectChain.length && currentObject; i++) {
            const nextObj = objectChain[i];
            currentObject = currentObject[nextObj];
        }
        return currentObject;
    }

    // character is js identifier
    public static isIdentifierChar(char: string): boolean {
        return char.match(/[a-zA-Z0-9_$]/) !== null;
    }

    public static getIdentifier(line: string, position: number) {
        if (!this.isIdentifierChar(line.charAt(position))) {
            return null;
        }
        let i: number;
        for (i = position; i > 0 && this.isIdentifierChar(line.charAt(i)); i--) {}
        let left_border = i + 1;
        for (i = position; i < line.length && this.isIdentifierChar(line.charAt(i)); i++) {}
        let right_border = i;

        return line.substring(left_border, right_border);
    }

    public static parseObjectString(line: string, position: number): string[] {
        let selectedIdentifier = this.getIdentifier(line, position);
        
        if (!selectedIdentifier) {
            return [];
        }

        let objectChain: string[] = [selectedIdentifier];
        const specialChars = [';', '(', ')', '{', '}', '[', ']', '=', '+', '-', '*', '/', '%', '!', '?', ':', ','];

        for (let i = position - selectedIdentifier.length; i > 0 && !specialChars.includes(line.charAt(i)) ; i--) {
            let identifier = this.getIdentifier(line, i);
            if (identifier) {
                objectChain.unshift(identifier);
                i -= identifier.length;
            }
        }

        for (let i = position + selectedIdentifier.length; i < line.length && !specialChars.includes(line.charAt(i)) ; i++) {
            let identifier = this.getIdentifier(line, i);
            if (identifier) {
                objectChain.push(identifier);
                i += identifier.length;
            }
        }
        
        
        return objectChain;
    }
}