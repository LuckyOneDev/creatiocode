import * as vscode from "vscode";
import {
  CreatioFileSystemProvider,
  Directory,
  Entry,
  File,
} from "./CreatioFileSystemProvider";
import { FileSystemHelper } from "./FileSystemHelper";

export class CreatioExplorerDecorationProvider
  implements vscode.FileDecorationProvider {
  private constructor() {
    CreatioFileSystemProvider.getInstance().onDidChangeFile((events: vscode.FileChangeEvent[]) => {
      events.forEach(event => {
        if (event.type === vscode.FileChangeType.Changed) {
          this._fireSoon(event.uri);
        }
      });
    });
  }
  private static instance: CreatioExplorerDecorationProvider;
  public static getInstance(): CreatioExplorerDecorationProvider {
    if (!CreatioExplorerDecorationProvider.instance) {
      CreatioExplorerDecorationProvider.instance =
        new CreatioExplorerDecorationProvider();
    }
    return CreatioExplorerDecorationProvider.instance;
  }

  provideFileDecoration(
    uri: vscode.Uri,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.FileDecoration> {
    if (uri.scheme === "creatio") {
      const file = CreatioFileSystemProvider.getInstance().getMemFile(uri);
      const folder = CreatioFileSystemProvider.getInstance().getMemFolder(uri);
      if (file) {
        return this.buildFileDecoration(file);
      } else if (folder) {
        // No decorations needed yet
      } else {
        // Something really bad happened
        return {
          badge: "Err",
          tooltip: "Selected resource is not file nor folder",
        };
      }
    }

    return undefined;
  }

  buildFileDecoration(file: File): vscode.FileDecoration {
    let badge = "";
    let tooltipItems = [];

    if (file.workSpaceItem.isChanged) {
      badge += "*";
      tooltipItems.push("Changed");
    }

    if (file.workSpaceItem.isLocked) {
      badge += "🔒";
      tooltipItems.push("Locked");
    }

    let color = file.isError ? new vscode.ThemeColor("list.errorForeground") : undefined;
    
    return new vscode.FileDecoration(badge, tooltipItems.join("|"), color);
  }

  private _emitter = new vscode.EventEmitter<vscode.Uri[]>();
  private _bufferedEvents: vscode.Uri[] = [];
  private _fireSoonHandle?: NodeJS.Timer;

  readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri[]> =
    this._emitter.event;

  _fireSoon(...events: vscode.Uri[]): void {
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
    super(
      resource.name,
      resource instanceof Directory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    this.resourceUri =
      CreatioFileSystemProvider.getInstance().fsHelper.getPath(resource);
    if (resource instanceof Directory) {
      this.contextValue = "CreatioPackage";
      this.iconPath = resource.package?.isReadOnly
        ? new vscode.ThemeIcon("gist-private")
        : new vscode.ThemeIcon("file-directory");
      this.description = resource.package?.version;
      this.tooltip = `Maintainer: ${resource.package?.maintainer}\nDescription: ${resource.package?.description}`;
    } else {
      this.contextValue = "CreatioSchema";
      this.command = {
        command: "creatiocode.loadFile",
        title: "Open file",
        arguments: [this.resourceUri],
      };
      this.description =
        resource.workSpaceItem.title &&
          resource.name.includes(resource.workSpaceItem.title)
          ? undefined
          : resource.workSpaceItem.title;
      this.tooltip = this.description;
    }
  }

  private sortEntries(entries: Entry[]): Entry[] {
    return entries.sort((a, b) => {
      if (a instanceof File && b instanceof File) {
        let fileA = a as File;
        let fileB = b as File;
        if (fileA.workSpaceItem.isChanged && !fileB.workSpaceItem.isChanged) {
          return -1;
        } else if (
          fileA.workSpaceItem.isLocked &&
          !fileB.workSpaceItem.isLocked
        ) {
          return -1;
        } else {
          return 0;
        }
      } else {
        return 0;
      }
    });
  }

  getChildren(): vscode.ProviderResult<CreatioExplorerItem[]> {
    let entries = CreatioFileSystemProvider.getInstance().getDirectoryContents(
      this.resourceUri!
    );
    return this.sortEntries(entries).map(
      (entry) => new CreatioExplorerItem(entry)
    );
  }
}

export class CreatioExplorer
  implements vscode.TreeDataProvider<CreatioExplorerItem>
{
  // Singleton
  private constructor() { }

  private static instance: CreatioExplorer;
  public static getInstance(): CreatioExplorer {
    if (!CreatioExplorer.instance) {
      CreatioExplorer.instance = new CreatioExplorer();
    }
    return CreatioExplorer.instance;
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
    let fs = CreatioFileSystemProvider.getInstance();
    if (!element) {
      return this.sortFolders(fs.folders).map(
        (folder) => new CreatioExplorerItem(folder)
      );
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
