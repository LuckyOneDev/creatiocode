import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class CreatioExplorer implements vscode.TreeDataProvider<File> {
	onDidChangeTreeData?: vscode.Event<void | File | File[] | null | undefined> | undefined;
	getTreeItem(element: File): vscode.TreeItem | Thenable<vscode.TreeItem> {
		throw new Error('Method not implemented.');
	}
	getChildren(element?: File | undefined): vscode.ProviderResult<File[]> {
		throw new Error('Method not implemented.');
	}
	getParent?(element: File): vscode.ProviderResult<File> {
		throw new Error('Method not implemented.');
	}
	resolveTreeItem?(item: vscode.TreeItem, element: File, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
		throw new Error('Method not implemented.');
	}

  
}

class File extends vscode.TreeItem {

}