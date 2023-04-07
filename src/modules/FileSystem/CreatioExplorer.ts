import * as vscode from "vscode";
import { CreatioCodeContext } from "../../globalContext";
import { CreatioExplorerItem, Directory } from "./ExplorerItem";

export class CreatioExplorer implements vscode.TreeDataProvider<CreatioExplorerItem> {
    cache: CreatioExplorerItem[] = [];

    reveal(uri: vscode.Uri) {
        const treeView = vscode.window.createTreeView("creatiocode.Explorer", {
            treeDataProvider: CreatioCodeContext.explorer,
        });
        let file = CreatioCodeContext.fsProvider.getMemFile(uri);
        if (file) {
            let item = new CreatioExplorerItem(file);
            treeView.reveal(item, { select: true });
        }
    }

    getParent(
        element: CreatioExplorerItem
    ): vscode.ProviderResult<CreatioExplorerItem> {
        let packageUid = CreatioCodeContext.fsProvider.getMemFile(
            element.resourceUri
        )?.workSpaceItem.packageUId;
        var dir = CreatioCodeContext.fsProvider.folders.find((folder) => {
            folder.package?.uId === packageUid;
        });

        if (dir) {
            return new CreatioExplorerItem(dir);
        } else {
            return null;
        }
    }

    getTreeItem(
        element: CreatioExplorerItem
    ): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    sortFolders(folders: Directory[]) {
        return folders.sort((a, b) => {
            let readonlyA = a.package?.isReadOnly;
            let readonlyB = b.package?.isReadOnly;
            if (readonlyA === readonlyB) {
                return a.name.localeCompare(b.name);
            } else {
                return readonlyA ? 1 : -1;
            }
        });
    }

    getChildren(
        element?: CreatioExplorerItem | undefined
    ): vscode.ProviderResult<CreatioExplorerItem[]> {
        let fs = CreatioCodeContext.fsProvider;
        if (!element) {
            return this.sortFolders(fs.folders).map(
                (folder) => new CreatioExplorerItem(folder)
            );
        } else {
            return element.getChildren();
        }
    }

    public refresh(): void {
        this._onDidChangeTreeData?.fire();
    }

    private _onDidChangeTreeData: vscode.EventEmitter<
        CreatioExplorerItem | undefined | void
    > = new vscode.EventEmitter<CreatioExplorerItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<
        CreatioExplorerItem | undefined | void
    > = this._onDidChangeTreeData.event;

    private _onDidStatusUpdate: vscode.EventEmitter<CreatioExplorerItem> =
        new vscode.EventEmitter<CreatioExplorerItem>();
    readonly onDidStatusUpdate: vscode.Event<CreatioExplorerItem> =
        this._onDidStatusUpdate.event;
}
