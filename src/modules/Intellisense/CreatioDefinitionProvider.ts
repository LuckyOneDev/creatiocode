import * as vscode from 'vscode';

export class CreatioDefinitionProvider implements vscode.DefinitionProvider {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
        let word = document.getText(document.getWordRangeAtPosition(position));
        return;
    }
}