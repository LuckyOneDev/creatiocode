import * as vscode from "vscode";
import { PackageMetaInfo, Schema, WorkSpaceItem } from "../../creatio-api/CreatioTypeDefinitions";
import { CreatioCodeContext } from "../../globalContext";

export class File implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;
    name: string;
    isError: boolean = false;
    workSpaceItem: WorkSpaceItem;
    schema?: Schema;

    permissions?: vscode.FilePermission;
    lastSynced: number = Date.UTC(0,0);

    isLoaded(): boolean {
        return this.schema !== undefined && this.schema.body !== undefined && this.schema.body !== "";
    }

    constructor(name: string, schema: WorkSpaceItem, ctime: number = Date.now(), mtime: number = Date.now(), size: number = 0) {
        this.type = vscode.FileType.File;
        this.ctime = ctime;
        this.mtime = mtime;
        this.size = size;
        this.name = name;
        this.workSpaceItem = schema;
        this.permissions = schema?.isReadOnly ? vscode.FilePermission.Readonly : undefined;
    }
}

export class Directory implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;
    name: string;
    permissions?: vscode.FilePermission;
    package: PackageMetaInfo | null;

    constructor(name: string, pack: PackageMetaInfo | null = null) {
        this.type = vscode.FileType.Directory;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
        this.package = pack;
        this.permissions = pack?.isReadOnly ? vscode.FilePermission.Readonly : undefined;
    }
}

export type Entry = File | Directory;

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
        this.resourceUri = CreatioCodeContext.fsHelper.getPath(resource);
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
        let entries = CreatioCodeContext.fsProvider.getDirectoryContents(
            this.resourceUri!
        );
        return this.sortEntries(entries).map(
            (entry) => new CreatioExplorerItem(entry)
        );
    }
}