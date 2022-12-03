import * as vscode from 'vscode';
import { CreatioFS, Directory, Entry } from './fileSystemProvider';
import { FileSystemHelper } from './fsHelper';

export class CreatioExplorerItem extends vscode.TreeItem {
    children: CreatioExplorerItem[] = [];
    constructor(resource: Entry, tooltip?: string) {
        super(resource.name, resource instanceof Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.resourceUri = FileSystemHelper.getPath(resource);
        this.tooltip = tooltip;
        if (resource instanceof Directory) {
            this.iconPath = new vscode.ThemeIcon('folder');
        } else {
            this.command = { command: 'creatiocode.loadFile', title: 'Open file', arguments: [this.resourceUri] };
        }
    }

    getChildren(): vscode.ProviderResult<CreatioExplorerItem[]> {
        return CreatioFS.getInstance().getDirectoryContents(this.resourceUri!).map((entry) => new CreatioExplorerItem(entry));
    }
}

export class CreatioExplorer implements vscode.TreeDataProvider<CreatioExplorerItem> {
    // Singleton
    private constructor() { }
    private static instance: CreatioExplorer;
    public static getInstance(): CreatioExplorer {
        if (!CreatioExplorer.instance) {
            CreatioExplorer.instance = new CreatioExplorer();
        }
        return CreatioExplorer.instance;
    }

    private _onDidChangeTreeData: vscode.EventEmitter<CreatioExplorerItem | undefined | void> = new vscode.EventEmitter<CreatioExplorerItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<CreatioExplorerItem | undefined | void> = this._onDidChangeTreeData.event;

    private _onDidStatusUpdate: vscode.EventEmitter<CreatioExplorerItem> = new vscode.EventEmitter<CreatioExplorerItem>();
    readonly onDidStatusUpdate: vscode.Event<CreatioExplorerItem> = this._onDidStatusUpdate.event;

    getTreeItem(element: CreatioExplorerItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: CreatioExplorerItem | undefined): vscode.ProviderResult<CreatioExplorerItem[]> {
        let fs = CreatioFS.getInstance();
        if (!element) {
            // Load fs
            var folders = fs.folders.map(folder => new CreatioExplorerItem(folder));
            return folders;
        } else {
            return element.getChildren();
        }
    }

    // getParent?(element: CreatioExplorerItem): vscode.ProviderResult<CreatioExplorerItem> {
    //     throw new Error('Method not implemented.');
    // }

    // resolveTreeItem?(item: vscode.TreeItem, element: CreatioExplorerItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
    //     throw new Error('Method not implemented.');
    // }

    public refresh(): void {
        this._onDidChangeTreeData?.fire();
    }
}