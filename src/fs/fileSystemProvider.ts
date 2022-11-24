import * as vscode from 'vscode';
import { CreatioClient } from '../api/creatioClient';
import { PackageMetaInfo, Schema, WorkSpaceItem, SchemaType } from '../api/creatioTypes';
import { CreatioStatusBar } from '../common/statusBar';
import { ConfigHelper } from '../common/configurationHelper';
import { FileSystemHelper } from './fsHelper';
import { CreatioCodeUtils } from '../common/utils';
import { wait } from 'ts-retry';
import { utils } from 'mocha';

export class File implements vscode.FileStat {
    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;
    name: string;

    workSpaceItem: WorkSpaceItem;
    schema?: Schema;

    permissions?: vscode.FilePermission;

    isLoaded(): boolean {
        return this.schema !== undefined &&  this.schema.body !== undefined && this.schema.body !== "";
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

export class CreatioFS implements vscode.FileSystemProvider {
    // Singleton
    private constructor() { }
    private static instance: CreatioFS;
    public static getInstance(): CreatioFS {
        if (!CreatioFS.instance) {
            CreatioFS.instance = new CreatioFS();
        }
        return CreatioFS.instance;
    }

    getUriByName(docName: string): vscode.Uri[] {
        let files = this.files.filter(x => x.name === `${docName}${ConfigHelper.getExtension(SchemaType.clientUnit)}`);
        return files.map(x => FileSystemHelper.getPath(x));
    }

    getSchemaUri(uId: string): vscode.Uri {
        let file = this.files.find(x => x.workSpaceItem.uId === uId);
        if (!file) {
            throw new Error("Schema not found");
        }
        return FileSystemHelper.getPath(file);
    }

    // async replaceSchema(uri: vscode.Uri, schema: File): Promise<boolean> {
    //     if (schema) {
    //         FileSystemHelper.write(uri, schema);
    //         await vscode.window.activeTextEditor?.edit((edit) => {
    //             vscode.window.visibleTextEditors.forEach((editor) => {
    //                 const document = editor.document;
    //                 if (document?.uri === uri) {
    //                     edit.replace(new vscode.Range(
    //                         document!.lineAt(0).range.start,
    //                         document!.lineAt(document!.lineCount - 1).range.end
    //                     ), schema!.schema.body);
    //                 }
    //             });
    //         });
    //         return true;
    //     } else {
    //         return false;
    //     }
    // }

    async restoreSchema(uri: vscode.Uri): Promise<void> {
        let file = this.getMemFile(uri);
        if (file?.workSpaceItem) {
            if (file.workSpaceItem.isChanged) {
                CreatioStatusBar.animate("Restoring schema");
                let response = await this.client?.revertElements([file?.workSpaceItem]);
                if (response?.success) {
                    file = await this.read(uri, true);

                    if (file && file.schema) {
                        FileSystemHelper.write(uri, file);
                        await vscode.window.activeTextEditor?.edit((edit) => {
                            vscode.window.visibleTextEditors.forEach((editor) => {
                                const document = editor.document;
                                if (document?.uri === uri) {
                                    edit.replace(new vscode.Range(
                                        document!.lineAt(0).range.start,
                                        document!.lineAt(document!.lineCount - 1).range.end
                                    ), file!.schema!.body);
                                }
                            });
                            CreatioStatusBar.update("Schema restored");
                        });
                    }
                    CreatioStatusBar.update("Schema restored");
                } else {
                    vscode.window.showErrorMessage(JSON.stringify(response?.errorInfo));
                    CreatioStatusBar.update("Error");
                }
            } else {
                vscode.window.showErrorMessage("Schema is not changed!");
                CreatioStatusBar.update("Error");
            }
        } else {
            vscode.window.showErrorMessage("Schema not found");
            CreatioStatusBar.update("Error");
        }
    }

    clearCache() {
        CreatioCodeUtils.createYesNoDialouge("Delete all downloaded files?", () => {
            FileSystemHelper.clearFolder(FileSystemHelper.getCacheFolder());
            this.init();
        });
    }

    async cacheFolder(folder: vscode.Uri): Promise<void> {
        if (folder.path === "/") {
            return;
        }

        CreatioCodeUtils.createYesNoDialouge("Download package?", async () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
            }, async (progress, token) => {
                progress.report({
                    message: `Downloading package '${folder.path}'`,
                });
                let files = this.getDirectoryContents(folder);

                for (const iterator of files) {
                    if (token.isCancellationRequested) {
                        break;
                    }
                    await this.read(FileSystemHelper.getPath(iterator), true); 
                    progress.report({
                        message: `Downloading package: '${folder.path}' file: ${iterator.name}`,
                        increment: 100 / files.length
                    });
                }
            });
        });
    }

    folders: Directory[] = [];
    files: File[] = [];
    root = new Directory('/');

    client: CreatioClient | null = null;

    stat(uri: vscode.Uri): vscode.FileStat {
        if (uri.path === "/") {
            return this.root;
        }

        let folder = this.folders.find(x => FileSystemHelper.getPath(x).path === uri.path);
        if (folder) {
            return folder;
        }

        let file = this.getMemFile(uri);
        if (file) {
            return file;
        }

        throw vscode.FileSystemError.FileNotFound();
    }

    getDirectoryContents(uri: vscode.Uri): Entry[] {
        let folder = this.folders.find(x => FileSystemHelper.getPath(x).path === uri.path);
        if (folder) {
            return this.files.filter(x => x.workSpaceItem.packageName === folder?.package?.name);
        }

        return [];
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        if (uri.path === "/") {
            return this.folders.map(x => [x.name, vscode.FileType.Directory]);
        }
        const pack = this.folders.find(x => FileSystemHelper.getPath(x).path === uri.path);
        if (pack?.package) {
            return this.files.filter(x => x?.workSpaceItem.packageUId === pack.package?.uId).map(x => [x.name, x.type]);
        } else {
            throw vscode.FileSystemError.FileNotFound();
        }
    }

    async getParentFiles(file: File, token: vscode.CancellationToken): Promise<{ files: Array<File>, cancelled: boolean }> {
        let items = [] as Array<File>;
        if (this.client) {
            // Ensure loaded
            let first = await this.read(FileSystemHelper.getPath(file));
            if (first) {
                items.push(first);
                while (items[items.length - 1].schema?.parent && token.isCancellationRequested === false) {
                    // @ts-ignore
                    let newFile = await this.read(this.getSchemaUri(items[items.length - 1].schema?.parent.uId));
                    if (newFile) {
                        items.push(newFile);
                    } else {
                        break;
                    }
                }
            }
        }
        return {
            files: items,
            cancelled: token.isCancellationRequested
        };
    }

    async getRelatedFiles(workSpaceItem: WorkSpaceItem, token: vscode.CancellationToken): Promise<{ files: Array<File>, cancelled: boolean }> {
        let alikePaths = this.getUriByName(workSpaceItem.name);
        let files: File[] = alikePaths.map(uri => {
            if (!token.isCancellationRequested) {
                let file = this.getMemFile(uri);
                if (file !== undefined) {
                    return file;
                } else {
                    throw new Error("File not found");
                }
            } else {
                throw new Error("Operation cancelled");
            }
        });

        if (token.isCancellationRequested) {
            return {
                files: [] as File[],
                cancelled: true
            };
        }

        // Order files by parent-child relation
        let orderedFiles: File[] = [];
        let root = files.find(x => x.schema?.parent.uId === undefined);
        if (!root) {
            throw new Error("Root schema not found");
        }

        orderedFiles.push(root);

        for (let i = 0; i < files.length; i++) {
            let child = files.find(x => x.schema?.parent.uId === orderedFiles[i].schema?.uId);
            if (child) {
                orderedFiles.push(child);
            } else {
                break;
            }
        }

        return {
            files: files,
            cancelled: token.isCancellationRequested
        };
    }

    getMemFile(uri: vscode.Uri): File | undefined {
        return this.files.find(x => FileSystemHelper.getPath(x).path === uri.path);
    }

    private async swapContent(uri: vscode.Uri, file: File) {
        if (!file.schema) {
            return;
        }
        
        FileSystemHelper.write(uri, file);
        this._fireSoon({
            type: vscode.FileChangeType.Changed,
            uri: uri
        });

        vscode.window.visibleTextEditors.filter(x => x.document.uri.path === uri.path).forEach((editor) => {
            const document = vscode.window.activeTextEditor?.document;
            editor.edit(edit => {
                edit.replace(new vscode.Range(
                    document!.lineAt(0).range.start,
                    document!.lineAt(document!.lineCount - 1).range.end
                ), file.schema!.body.toString());
            });
        });
        vscode.window.showInformationMessage("File updated");
    }

    private async read(uri: vscode.Uri, silent: boolean = false): Promise<File> {
        if (!this.client) {
            CreatioCodeUtils.createReconnectDialouge();
            throw new Error("Not connected");
        }

        let inMemFile = this.files.find(file => FileSystemHelper.getPath(file).path === uri.path);
        if (!inMemFile) {
            throw vscode.FileSystemError.FileNotFound();
        }

        // Try to read from disk
        let localFile = FileSystemHelper.read(uri);

        if (localFile) {
            if (localFile.isLoaded() && !silent) {
                if (ConfigHelper.isCarefulMode()) {
                    // File is fully loaded. Comparing to server version
                    this.client.getSchema(localFile.workSpaceItem.uId, localFile.workSpaceItem.type).then(async (schema) => {
                        if (schema) {
                            if (JSON.stringify(schema.body) !== JSON.stringify(localFile!.schema?.body)) {
                                CreatioCodeUtils.createYesNoDialouge(`File on server is different from local. Pull ${schema.name} from server?`, () => {
                                    localFile!.schema = schema;
                                    this.swapContent(uri, localFile!);
                                });
                            }
                        } else {
                            throw vscode.FileSystemError.FileNotFound();
                        }
                    });
                }
                return localFile;
            } else {
                // File is partially loaded
                let schema = await this.client.getSchema(localFile.workSpaceItem.uId, localFile.workSpaceItem.type);
                if (schema) {
                    localFile.schema = schema;
                    FileSystemHelper.write(uri, localFile);
                    return localFile;
                } else {
                    throw vscode.FileSystemError.FileNotFound();
                }
            }
        }

        return inMemFile;
    }

    readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        return new Promise((resolve, reject) => {
            if (uri.path.includes(".vscode")) {
                resolve(new Uint8Array()); // insert vscode settings here
                return;
            }

            CreatioStatusBar.animate("Loading file...");
            this.read(uri).then(file => {
                if (file) {
                    resolve(Buffer.from(file.schema!.body));
                    CreatioStatusBar.update("Loading finished");
                } else {
                    reject(vscode.FileSystemError.FileNotFound());
                    CreatioStatusBar.update("Loading error");
                }
            });
        });
    }

    async init() {
        if (this.client && this.client.isConnected()) {
            FileSystemHelper.root = this.client.credentials.getHostName();
            CreatioStatusBar.animate("Loading files");
            this.folders = (await this.client.getPackages()).map(x => new Directory(x.name, x));
            if (this.folders.length === 0) {
                vscode.window.showErrorMessage("No available packages found");
                CreatioStatusBar.update("Error");
                return;
            }

            this.files = (await this.client.getWorkspaceItems()).map(x => new File(FileSystemHelper.withExtension(x), x));
            if (this.files.length === 0) {
                vscode.window.showErrorMessage("No available schemas found");
                CreatioStatusBar.update("Error");
                return;
            }

            this.files = this.files.filter(x => {
                return ConfigHelper.isFileTypeEnabled(x.workSpaceItem.type);
            });

            this.folders.forEach(element => {
                const uri = FileSystemHelper.getPath(element);
                const baseDir = FileSystemHelper.getBaseDir(uri);

                this._fireSoon(
                    { type: vscode.FileChangeType.Changed, uri: baseDir },
                    { type: vscode.FileChangeType.Created, uri: uri }
                );
            });

            this.files.forEach(file => {
                file.mtime = Date.now();
                FileSystemHelper.update(FileSystemHelper.getPath(file), file);
                this._fireSoon({
                    type: vscode.FileChangeType.Created,
                    uri: FileSystemHelper.getPath(file)
                });
            });

            CreatioStatusBar.update("Filesystem loaded");
        } else {
            CreatioCodeUtils.createReconnectDialouge(this.init.bind(this));
        }
    }


    getFileType(uri: vscode.Uri): SchemaType;
    getFileType(fileName: String): SchemaType;
    getFileType(uri: any): SchemaType {
        if (uri instanceof vscode.Uri) {
            let fileName = uri.toString().split('/').pop();
            if (fileName) {
                return this.getFileType(fileName);
            } else {
                return SchemaType.unknown;
            }
        }
        if (uri instanceof String) {
            ConfigHelper.getSchemaTypeByExtension(uri.toString());
        }
        return SchemaType.unknown;
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void | Thenable<void> {
        let file: any = FileSystemHelper.read(uri);
        // Local save
        if (file && file.schema) {
            file.schema.body = content.toString();
            FileSystemHelper.write(uri, file);
        }

        if (!file && options.create) {
            if (ConfigHelper.isFileTypeEnabled(this.getFileType(uri))) {
                // Create file
                // this._fireSoon({ type: vscode.FileChangeType.Created, uri });
                throw new Error("Not implemented");
            }
        }

        if (options.overwrite && file?.schema) {
            file.schema.body = content.toString();
            CreatioStatusBar.animate("Saving file...");
            return this.client?.saveSchema(file.schema).then(response => {
                if (!response) {
                    CreatioStatusBar.update("Error saving file");
                    return;
                } else {
                    this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
                    file!.workSpaceItem.isChanged = true;
                    this.init();
                    CreatioStatusBar.update("File saved");
                    return;
                }
            });
        }

        throw vscode.FileSystemError.FileNotFound();
    }

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        vscode.window.showInformationMessage("Renaming is not supported");
        throw new Error("Not implemented");
    }

    delete(uri: vscode.Uri): void {
        let file = this.getMemFile(uri);
        if (this.client && this.client.isConnected()) {
            if (file) {
                this.client.deleteSchema([file.workSpaceItem.id]);
                this._fireSoon({ type: vscode.FileChangeType.Deleted, uri });
            } else {
                vscode.window.showInformationMessage("Package deletion is not supported. Please use web interface.");
            }
        } else {
            CreatioCodeUtils.createReconnectDialouge();
        }
    }



    createDirectory(uri: vscode.Uri): void {
        vscode.window.showInformationMessage("Package creation is not supported. Please use web interface.");
        throw new Error("Not implemented");
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