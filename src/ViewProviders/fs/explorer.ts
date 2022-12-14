import * as vscode from 'vscode';
import { CreatioFS, Directory, Entry, File } from './fileSystemProvider';
import { FileSystemHelper } from './fsHelper';

export class CreatioExplorerDecorationProvider implements vscode.FileDecorationProvider {
    private constructor() {
        CreatioFS.getInstance().onDidChangeFile((e: vscode.FileChangeEvent[]) => {
            e.forEach(x => {
                if (x.type === vscode.FileChangeType.Changed) {
                    this._emitter.fire([x.uri]);
                }
            });
        });
    }
    private static instance: CreatioExplorerDecorationProvider;
    public static getInstance(): CreatioExplorerDecorationProvider {
        if (!CreatioExplorerDecorationProvider.instance) {
            CreatioExplorerDecorationProvider.instance = new CreatioExplorerDecorationProvider();
        }
        return CreatioExplorerDecorationProvider.instance;
    }

    provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FileDecoration> {
        if (uri.scheme === 'creatio') {
            const file = CreatioFS.getInstance().getMemFile(uri);
            const folder = CreatioFS.getInstance().getMemFolder(uri);
            if (file) {
                return this.buildFileDecoration(file);
            } else if (folder) {
                // No decorations needed yet
            } else {
                // Something really bad happened
                return {
                    badge: "Err",
                    tooltip: "Selected resource is not file nor folder"
                };
            }
        }

        return undefined;
    }

    buildFileDecoration(file: File): vscode.FileDecoration {
        let badge = "";
        let tooltipItems = [];

        if (file.workSpaceItem.isChanged) {
            badge += "●";
            tooltipItems.push("Changed");
        }

        if (file.workSpaceItem.isLocked) {
            badge += "🔒";
            tooltipItems.push("Locked");
        }

        return {
            badge: badge,
            tooltip: tooltipItems.join(" | ")
        };
    }

    private _emitter = new vscode.EventEmitter<vscode.Uri[]>();
    private _bufferedEvents: vscode.Uri[] = [];
    private _fireSoonHandle?: NodeJS.Timer;
    
    readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri[]> = this._emitter.event;


    private _fireSoon(...events: vscode.Uri[]): void {
        this._bufferedEvents.push(...events);

        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }

        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0;
        }, 5);
    }

}

export class CreatioExplorerItem extends vscode.TreeItem {
    children: CreatioExplorerItem[] = [];
    resourceUri: vscode.Uri;

    constructor(resource: Entry) {
        super(resource.name, resource instanceof Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.resourceUri = CreatioFS.getInstance().fsHelper.getPath(resource);
        if (resource instanceof Directory) {
            this.contextValue = 'CreatioPackage';
            this.iconPath = resource.package?.isReadOnly ? new vscode.ThemeIcon('gist-private') : new vscode.ThemeIcon('file-directory');
            this.description = resource.package?.version;
            this.tooltip = `Maintainer: ${resource.package?.maintainer}\nDescription: ${resource.package?.description}`;
        } else {
            this.contextValue = 'CreatioSchema';
            this.command = { command: 'creatiocode.loadFile', title: 'Open file', arguments: [this.resourceUri] };
            this.description = resource.workSpaceItem.title && resource.name.includes(resource.workSpaceItem.title) ? undefined : resource.workSpaceItem.title;
            this.tooltip = this.description;
        }
    }

    getChildren(): vscode.ProviderResult<CreatioExplorerItem[]> {
        return CreatioFS.getInstance().getDirectoryContents(this.resourceUri!).map((entry) => new CreatioExplorerItem(entry));
    }
}

export class CreatioExplorer implements vscode.TreeDataProvider<CreatioExplorerItem> {
    // Singleton
    private constructor() {

    }

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
            var folders = fs.folders
                .sort((a, b) => a.name.localeCompare(b.name))
                .sort((a) => {
                    if (a.package) {
                        return a.package?.isReadOnly ? 1 : -1;
                    } else {
                        return 0;
                    }
                }).map(folder => new CreatioExplorerItem(folder));
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