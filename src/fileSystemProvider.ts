/* eslint-disable curly */
import * as path from 'path';
import * as vscode from 'vscode';
import { CreatioClient, PackageMetaInfo, SchemaMetaInfo, SchemaType } from './creatio-api';

export class File implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;
    name: string;
    schema: SchemaMetaInfo;

    data?: Uint8Array;
    permissions?: vscode.FilePermission;

    constructor(name: string, schema: SchemaMetaInfo, ctime: number = Date.now(), mtime: number = Date.now(), size: number = 0) {
        this.type = vscode.FileType.File;
        this.ctime = ctime;
        this.mtime = mtime;
        this.size = size;
        this.name = name;
        this.schema = schema;
    }
}

export class Directory implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;
    name: string;
    permissions?: vscode.FilePermission;
    package?: PackageMetaInfo;

    constructor(name: string, pack: PackageMetaInfo | undefined = undefined) {
        this.type = vscode.FileType.Directory;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
        this.package = pack;
        this.permissions = undefined;
    }
}

export type Entry = File | Directory;

export class CreatioFS implements vscode.FileSystemProvider {
    private static instance: CreatioFS;
    config = vscode.workspace.getConfiguration('creatiocode');
    folders: Directory[] = [];
    files: File[] = [];
    /**
     * The Singleton's constructor should always be private to prevent direct
     * construction calls with the `new` operator.
     */
    private constructor() { }

    root = new Directory('/');

    public static getInstance(): CreatioFS {
        if (!CreatioFS.instance) {
            CreatioFS.instance = new CreatioFS();
        }
        return CreatioFS.instance;
    }

    client: CreatioClient | null = null;

    getDirectoryPath(dir: Directory): vscode.Uri {;
        return vscode.Uri.parse(`creatio:/${dir.name}`);
    }

    getBaseDir(uri: vscode.Uri): vscode.Uri {
        return uri.with({ path: path.posix.dirname(uri.path) });
    }

    getFilePath(file: File): vscode.Uri {
        return vscode.Uri.parse(`creatio:/${file.schema.packageName}/${this.getFileWithExtension(file.schema)}`);
    }

    getFileWithExtension(schema: SchemaMetaInfo): string {
        switch (schema.type) {
            case SchemaType.ClientUnit:
                return schema.name + ".js";
            case SchemaType.SourceCode:
            case SchemaType.ProcessUserTask:
                return schema.name + ".cs";
            case SchemaType.SqlScript:
                return schema.name + ".sql";
            case SchemaType.Entity:
                return schema.name + ".ent.json";
            case SchemaType.Data:
                return schema.name + ".data.json";
            case SchemaType.Process:
                return schema.name + ".bp";
            case SchemaType.Case:
                return schema.name + ".case";
            default:
                return schema.name;
        }
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        if (uri.path === "/") return this.root;

        let folder = this.folders.find(x => this.getDirectoryPath(x).path === uri.path);
        if (folder) return folder;

        let file = this.files.find(x => this.getFilePath(x).path === uri.path);
        if (file) return file;
        
        throw vscode.FileSystemError.FileNotFound();
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        if (uri.path === "/") {
            return this.folders.map(x => [x.name, vscode.FileType.Directory]);
        }
        const pack = this.folders.find(x => this.getDirectoryPath(x).path === uri.path);
        if (pack?.package) {
            return this.files.filter(x => x?.schema.packageUId === pack.package?.uId).map(x => [x.name, x.type]);
        } else {
            throw vscode.FileSystemError.FileNotFound();
        }
    }


    readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        let file = this.files.find(x => this.getFilePath(x).path === uri.path);
        if (file && this.client) {
            if (!file.data) {
                return this.client.getSchemaBuffer(file.schema.uId, file.schema.type).then(x => {
                    file!.data = x;
                    //this._fireSoon({ type: vscode.FileChangeType.Changed, uri: uri });
                    return x;
                });
            } else {
                return file.data;
            }
        }
        throw vscode.FileSystemError.FileNotFound();
    }


    async initFileSystem() {
        if (this.client && this.client.connected) {
            vscode.window.showInformationMessage("Loading files...");

            this.folders = (await this.client.getPackages()).map(x => new Directory(x.name, x));
            if (this.folders.length === 0) {
                vscode.window.showErrorMessage("Something went wrong. No packages found");
                return;
            }

            this.files = (await this.client.getWorkspaceItems()).map(x => new File(this.getFileWithExtension(x), x));
            if (this.files.length === 0) {
                vscode.window.showErrorMessage("Something went wrong. No schemas found");
                return;
            }

            this.folders.forEach(element => {
                const uri = this.getDirectoryPath(element);
                const baseDir = this.getBaseDir(uri);
                this._fireSoon(
                    { type: vscode.FileChangeType.Changed, uri: baseDir },
                    { type: vscode.FileChangeType.Created, uri: uri  }
                );
            });

            this.files.forEach(element => {
                element.mtime = Date.now();
                this._fireSoon(
                    {
                        type: vscode.FileChangeType.Created, 
                        uri: this.getFilePath(element)
                    });
            });

            vscode.window.showInformationMessage("Files loaded...");
        } else {
            vscode.window.showErrorMessage("Client is not connected. Reconnect?");
        }
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void | Thenable<void> {
        // const basename = path.posix.basename(uri.path);
        // const parent = this._lookupParentDirectory(uri);
        // let entry = parent.entries.get(basename);

        // if (entry instanceof Directory) {
        //     throw vscode.FileSystemError.FileIsADirectory(uri);
        // }

        // if (!entry && options.create) {
        //     // create file
        //     this._fireSoon({ type: vscode.FileChangeType.Created, uri });
        // }

        // if (entry && options.overwrite) {
        //     // save file
        //     entry.data = content;
        // }
    }

    // --- manage files/folders

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {

        // if (!options.overwrite && this._lookup(newUri, true)) {
        //     throw vscode.FileSystemError.FileExists(newUri);
        // }

        // const entry = this._lookup(oldUri, false);
        // const oldParent = this._lookupParentDirectory(oldUri);

        // const newParent = this._lookupParentDirectory(newUri);
        // const newName = path.posix.basename(newUri.path);

        // oldParent.entries.delete(entry.name);
        // entry.name = newName;
        // newParent.entries.set(newName, entry);

        // this._fireSoon(
        //     { type: vscode.FileChangeType.Deleted, uri: oldUri },
        //     { type: vscode.FileChangeType.Created, uri: newUri }
        // );
    }

    delete(uri: vscode.Uri): void {
        // const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        // const basename = path.posix.basename(uri.path);
        // const parent = this._lookupAsDirectory(dirname, false);
        // if (!parent.entries.has(basename)) {
        //     throw vscode.FileSystemError.FileNotFound(uri);
        // }
        // parent.entries.delete(basename);
        // parent.mtime = Date.now();
        // parent.size -= 1;
        // this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { uri, type: vscode.FileChangeType.Deleted });
    }

    createDirectory(uri: vscode.Uri): void {
        // const basename = path.posix.basename(uri.path);
        // const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        // const parent = this._lookupAsDirectory(dirname, false);

        // const entry = new Directory(basename, new PackageMetaInfo());
        // parent.entries.set(entry.name, entry);
        // parent.size += 1;
        // this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { type: vscode.FileChangeType.Created, uri });
    }

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    watch(_resource: vscode.Uri): vscode.Disposable {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }

    private _fireSoon(...events: vscode.FileChangeEvent[]): void {
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