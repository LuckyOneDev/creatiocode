import * as vscode from 'vscode';
import { IntellisenseHelper } from './IntellisenseHelper';

export class IntellisenseVirtualFileSystemProvider implements vscode.TextDocumentContentProvider {
    onDidChange?: vscode.Event<vscode.Uri> | undefined;

    private static instance: IntellisenseVirtualFileSystemProvider;
    public static getInstance(): IntellisenseVirtualFileSystemProvider {
        if (!IntellisenseVirtualFileSystemProvider.instance) {
            IntellisenseVirtualFileSystemProvider.instance = new IntellisenseVirtualFileSystemProvider();
        }
        return IntellisenseVirtualFileSystemProvider.instance;
    }

    provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
        let object = IntellisenseHelper.getCurrentObject(uri.path.split('/'));
        if (typeof(object) === 'function') {
            return object.toString();
        } 
    }
}