import * as path from 'path';
import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';

import { CreatioClient } from '../api/creatioClient';
import { PackageMetaInfo, Schema, WorkSpaceItem, SchemaType } from '../api/creatioTypes';
import { CreatioStatusBar } from '../common/statusBar';
import { ConfigHelper } from '../common/configurationHelper';

export class File implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;
    name: string;
    schemaMetaInfo: WorkSpaceItem;

    schema?: Schema;
    permissions?: vscode.FilePermission;

    constructor(name: string, schema: WorkSpaceItem, ctime: number = Date.now(), mtime: number = Date.now(), size: number = 0) {
        this.type = vscode.FileType.File;
        this.ctime = ctime;
        this.mtime = mtime;
        this.size = size;
        this.name = name;
        this.schemaMetaInfo = schema;
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
    package?: PackageMetaInfo;

    constructor(name: string, pack: PackageMetaInfo | undefined = undefined) {
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
        return files.map(x => this.getFilePath(x));
	}

    addSchemasToDisk(schemas: Schema[]) {
        schemas.forEach(x => {
            let uri = this.getSchemaUri(x.uId);
            if (uri) {
                this.writeToDisk(uri, x.body);
            }
        });
    }
    
    getSchemaUri(uId: string): vscode.Uri | undefined {
        let file = this.files.find(x => x.schemaMetaInfo.uId === uId);
        return file?.schemaMetaInfo.uId ? this.getFilePath(file) : undefined;
    }

    async replaceSchema(uri: vscode.Uri, schema: Schema): boolean {
        if (schema && schema.body) {
            this.writeToDisk(uri, schema.body);
            await vscode.window.activeTextEditor?.edit((edit) => {
                vscode.window.visibleTextEditors.forEach((editor) => {
                    const document = editor.document;
                    if (document?.uri === uri) {
                        edit.replace(new vscode.Range(
                            document!.lineAt(0).range.start,
                            document!.lineAt(document!.lineCount - 1).range.end
                        ), schema!.body);
                    }
                });
            });
            return true;
        } else {
            return false;
        }
    }

    async restoreSchema(uri: vscode.Uri): Promise<void> {
        let file = this.files.find(x => this.getFilePath(x).path === uri.path);
        if (file?.schemaMetaInfo) {
            if (file.schemaMetaInfo.isChanged) {
                CreatioStatusBar.animate("Restoring schema");
                let response = await this.client?.revertElements([file?.schemaMetaInfo]);
                if (response?.success) {
                    let schema = await this.client?.getSchema(file?.schemaMetaInfo.uId, file?.schemaMetaInfo.type);

                    if (schema && schema.body) {
                        this.writeToDisk(uri, schema.body);
                        await vscode.window.activeTextEditor?.edit((edit) => {
                            vscode.window.visibleTextEditors.forEach((editor) => {
                                const document = editor.document;
                                if (document?.uri === uri) {
                                    edit.replace(new vscode.Range(
                                        document!.lineAt(0).range.start,
                                        document!.lineAt(document!.lineCount - 1).range.end
                                    ), schema!.body);
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

    async clearCache() {
        return new Promise<void>((resolve, reject) => {
            vscode.window.showInformationMessage("Delete all downloaded files?", "Yes", "No").then(async (value) => {
                if (value && value === "Yes") {
                    fs.rmdir(this.getCacheFolder(), { recursive: true }, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            vscode.window.showInformationMessage("Cache cleared!");
                            resolve();
                        }
                    });
                }
            });
        });
    }

    async cacheFolder(folder: vscode.Uri): Promise<void> {
        if (folder.path === "/") {
            return;
        }
        
        vscode.window.showInformationMessage("Download package?", "Yes", "No").then(async (value) => {
            if (value && value === "Yes") {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                  }, 
                  async (progress) => {
                    progress.report({
                      message: `Downloading package '${folder.path}' ...`,
                    });

                    let files = this.readDirectory(folder);
                    let a = files.map(async x => {
                        setTimeout(async () => {
                            await this.readFileClient(vscode.Uri.parse(path.join(folder.toString(), x[0])), true);
                        }, 5);
                    });
                    await Promise.all(a);
                  });
            }
        });
    }

    folders: Directory[] = [];
    files: File[] = [];
    root = new Directory('/');

    client: CreatioClient | null = null;

    private getDirectoryPath(dir: Directory): vscode.Uri {
        return vscode.Uri.parse(`creatio:/${dir.name}`);
    }

    private getBaseDir(uri: vscode.Uri): vscode.Uri {
        return uri.with({ path: path.posix.dirname(uri.path) });
    }

    private getFilePath(file: File): vscode.Uri {
        return vscode.Uri.parse(`creatio:/${file.schemaMetaInfo.packageName}/${this.getFileWithExtension(file.schemaMetaInfo)}`);
    }

    getFileWithExtension(schema: WorkSpaceItem): string {
        return schema.name + ConfigHelper.getExtension(schema.type);
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        if (uri.path === "/") {
            return this.root;
        }

        let folder = this.folders.find(x => this.getDirectoryPath(x).path === uri.path);
        if (folder) {
            return folder;
        }

        let file = this.files.find(x => this.getFilePath(x).path === uri.path);
        if (file) {
            return file;
        }

        throw vscode.FileSystemError.FileNotFound();
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        if (uri.path === "/") {
            return this.folders.map(x => [x.name, vscode.FileType.Directory]);
        }
        const pack = this.folders.find(x => this.getDirectoryPath(x).path === uri.path);
        if (pack?.package) {
            return this.files.filter(x => x?.schemaMetaInfo.packageUId === pack.package?.uId).map(x => [x.name, x.type]);
        } else {
            throw vscode.FileSystemError.FileNotFound();
        }
    }

    private getCacheFolder(): string {
        return path.join(os.tmpdir(), "/creatiocode/");
    }

    private getSysFilePath(uri: vscode.Uri): string {
        if (!this.client?.credentials.getHostName()) {
            throw Error();
        }
        return path.join(this.getCacheFolder(), this.client.credentials.getHostName(), path.dirname(uri.path));
    }

    private getFullFilePath(uri: vscode.Uri): string {
        let filename = uri.toString().split('/').pop();
        if (!filename) {return "";}
        return path.join(this.getSysFilePath(uri), filename);
    }

    private writeToDisk(uri: vscode.Uri, data: string | NodeJS.ArrayBufferView) {
        if (!fs.existsSync(this.getSysFilePath(uri))) {
            fs.mkdirSync(this.getSysFilePath(uri), { recursive: true });
        }
        fs.writeFileSync(this.getFullFilePath(uri), data);
    }

    private readFromDisk(uri: vscode.Uri): Buffer | undefined {
        if (!this.client?.credentials.url) {
            throw vscode.FileSystemError.FileNotFound();
        }

        try {
            return fs.readFileSync(this.getFullFilePath(uri));
        } catch (error) {
            return undefined;
        }
    }

    getFile(uri: vscode.Uri): File | undefined {
        return this.files.find(x => this.getFilePath(x).path === uri.path);
    }

    private readFileClient(uri: vscode.Uri, local: boolean): Uint8Array | Thenable<Uint8Array> {
        let file = this.files.find(x => this.getFilePath(x).path === uri.path);
        if (file && this.client) {
            let data = this.readFromDisk(uri);
            if (!local) {CreatioStatusBar.animate("Loading file...");}
            if (!data) {
                return this.client.getSchema(file.schemaMetaInfo.uId, file.schemaMetaInfo.type).then(schema => {
                    if (schema) {
                        file!.schema = schema;
                        this.writeToDisk(uri, schema.body);
                        if (!local) {CreatioStatusBar.update("File loaded");}
                        return Buffer.from(schema.body);
                    } else {
                        if (!local) {CreatioStatusBar.update("Error loading file!");}
                        throw vscode.FileSystemError.FileNotFound();
                    }
                });
            } else if (!local) {
                this.client.getSchema(file.schemaMetaInfo.uId, file.schemaMetaInfo.type).then(schema => {
                    if (schema) {
                        file!.schema = schema;
                        if (data?.toString() !== schema.body) {
                            vscode.window.showInformationMessage("File on server is different from local file. Update local file?", "Yes", "No").then(async (value) => {
                                if (value && value === "Yes") {
                                    this.writeToDisk(uri, schema.body);
                                    this._fireSoon(
                                        {
                                            type: vscode.FileChangeType.Changed,
                                            uri: uri
                                        });
                                    await vscode.window.activeTextEditor?.edit((edit) => {
                                        const document = vscode.window.activeTextEditor?.document;
                                        edit.replace(new vscode.Range(
                                            document!.lineAt(0).range.start,
                                            document!.lineAt(document!.lineCount - 1).range.end
                                        ), schema.body.toString());
                                    });

                                    vscode.window.showInformationMessage("File updated");
                                }
                            });
                        }
                    } else {
                        CreatioStatusBar.update("Error loading file!");
                        throw vscode.FileSystemError.FileNotFound();
                    }
                });
                CreatioStatusBar.update("File loaded");
                return data;
            }
        }
        if (!local) {CreatioStatusBar.update("Error loading file!");}
        throw vscode.FileSystemError.FileNotFound();
    }

    readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        return this.readFileClient(uri, false);
    }


    async initFileSystem() {
        if (this.client && this.client.isConnected()) {
            CreatioStatusBar.animate("Loading files");
            this.folders = (await this.client.getPackages()).map(x => new Directory(x.name, x));
            if (this.folders.length === 0) {
                vscode.window.showErrorMessage("No available packages found");
                CreatioStatusBar.update("Error");
                return;
            }

            this.files = (await this.client.getWorkspaceItems()).map(x => new File(this.getFileWithExtension(x), x));
            if (this.files.length === 0) {
                vscode.window.showErrorMessage("No available schemas found");
                CreatioStatusBar.update("Error");
                return;
            }

            this.files = this.files.filter(x => {
                return ConfigHelper.isFileTypeEnabled(x.schemaMetaInfo.type);
            });

            this.folders.forEach(element => {
                const uri = this.getDirectoryPath(element);
                const baseDir = this.getBaseDir(uri);
                this._fireSoon(
                    { type: vscode.FileChangeType.Changed, uri: baseDir },
                    { type: vscode.FileChangeType.Created, uri: uri }
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

            CreatioStatusBar.update("Filesystem loaded");
        } else {
            this.reconnectDialouge();
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
        this.writeToDisk(uri, content);
        let file = this.files.find(x => this.getFilePath(x).path === uri.path);

        if (!file && options.create) {
            if (ConfigHelper.isFileTypeEnabled(this.getFileType(uri))) {
                // Create file
                // this._fireSoon({ type: vscode.FileChangeType.Created, uri });
                throw new Error("Not implemented");
            }
        }

        if (options.overwrite && file?.schema) {
            file.schema.body = content.toString();
            CreatioStatusBar.animate("Saving file");
            return this.client?.saveSchema(file.schema).then(response => {
                if (!response) {
                    CreatioStatusBar.update("Error saving file");
                    return;
                } else {
                    this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
                    file!.schemaMetaInfo.isChanged = true;
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
        let file = this.files.find(x => this.getFilePath(x).path === uri.path);

        if (this.client && this.client.isConnected()) {
            if (file) {
                this.client.deleteSchema([file.schemaMetaInfo.id]);
                this._fireSoon({ type: vscode.FileChangeType.Deleted, uri });
            } else {
                vscode.window.showInformationMessage("Package deletion is not supported. Please use web interface.");
            }
        } else {
            this.reconnectDialouge();
        }
    }

    reconnectDialouge() {
        vscode.window.showErrorMessage("Client is not connected. Reconnect?", "Reconnect").then((value) => {
            if (value === "Reconnect") {
                vscode.commands.executeCommand("creatiocode.reloadCreatioWorkspace");
            }
        });
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