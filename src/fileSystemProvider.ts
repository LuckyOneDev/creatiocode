import * as path from 'path';
import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';

import { CreatioClient } from './api/creatioClient';
import { PackageMetaInfo, Schema, WorkSpaceItem, SchemaType } from './api/creatioInterfaces';
import { CreatioStatusBar } from './statusBar';

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
    getSchemaUri(uId: string): vscode.Uri | undefined {
        let file = this.files.find(x => x.schemaMetaInfo.uId === uId);
        return file?.schemaMetaInfo.uId ? this.getFilePath(file) : undefined;
    }

    // Singleton
    private constructor() { }
    private static instance: CreatioFS;
    public static getInstance(): CreatioFS {
        if (!CreatioFS.instance) {
            CreatioFS.instance = new CreatioFS();
        }
        return CreatioFS.instance;
    }

    async revertSchema(uri: vscode.Uri): Promise<void> {
        let file = this.files.find(x => this.getFilePath(x).path === uri.path);
        if (file?.schemaMetaInfo) {
            if (file?.schemaMetaInfo.isChanged) {
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
        vscode.window.showInformationMessage("Download package?", "Yes", "No").then(async (value) => {
            if (value && value === "Yes") {
                let files = this.readDirectory(folder);
                await Promise.all(files.map(async x => {
                    setTimeout(async () => {
                        await this.readFile(vscode.Uri.parse(folder.toString() + "/" + x[0]));
                    }, 5);
                }));
                vscode.window.showInformationMessage("Files downloaded!");
            }
        });
    }


    config = vscode.workspace.getConfiguration('creatiocode');
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

    private getFileWithExtension(schema: WorkSpaceItem): string {
        switch (schema.type) {
            case SchemaType.clientUnit:
                return schema.name + this.config.get("fileTypes.ClientUnit.Extension");
            case SchemaType.sourceCode:
                return schema.name + this.config.get("fileTypes.SourceCode.Extension");
            case SchemaType.processUserTask:
                return schema.name + this.config.get("fileTypes.ProcessUserTask.Extension");
            case SchemaType.sqlScript:
                return schema.name + this.config.get("fileTypes.SqlScript.Extension");
            case SchemaType.entity:
                return schema.name + this.config.get("fileTypes.Entity.Extension");
            case SchemaType.data:
                return schema.name + this.config.get("fileTypes.Data.Extension");
            case SchemaType.process:
                return schema.name + this.config.get("fileTypes.Process.Extension");
            case SchemaType.case:
                return schema.name + this.config.get("fileTypes.Case.Extension");
            default:
                return schema.name;
        }
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
        return os.tmpdir() + "/creatiocode/";
    }

    private getSysFilePath(uri: vscode.Uri): string {
        let tmpDir = os.tmpdir();
        if (!this.client?.credentials.url) {
            throw Error();
        }
        return this.getCacheFolder() + this.client.credentials.url + path.dirname(uri.path);
    }

    private writeToDisk(uri: vscode.Uri, data: string | NodeJS.ArrayBufferView) {
        let filename = uri.toString().split('/').pop();
        if (!this.client?.credentials.url) {
            throw Error();
        }
        if (!fs.existsSync(this.getSysFilePath(uri))) {
            fs.mkdirSync(this.getSysFilePath(uri), { recursive: true });
        }
        fs.writeFileSync(this.getSysFilePath(uri) + "/" + filename, data);
    }

    private readFromDisk(uri: vscode.Uri): Buffer | undefined {
        let filename = uri.toString().split('/').pop();
        if (!this.client?.credentials.url) {
            throw vscode.FileSystemError.FileNotFound();
        }

        try {
            return fs.readFileSync(this.getSysFilePath(uri) + "/" + filename);
        } catch (error) {
            return undefined;
        }
    }

    getFile(uri: vscode.Uri): File | undefined {
        return this.files.find(x => this.getFilePath(x).path === uri.path);
    }

    readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        let file = this.files.find(x => this.getFilePath(x).path === uri.path);
        if (file && this.client) {
            let data = this.readFromDisk(uri);
            CreatioStatusBar.animate("Loading file...");
            if (!data) {
                return this.client.getSchema(file.schemaMetaInfo.uId, file.schemaMetaInfo.type).then(schema => {
                    if (schema) {
                        file!.schema = schema;
                        this.writeToDisk(uri, schema.body);
                        CreatioStatusBar.update("File loaded");
                        return Buffer.from(schema.body);
                    } else {
                        CreatioStatusBar.update("Error loading file!");
                        throw vscode.FileSystemError.FileNotFound();
                    }
                });
            } else {
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
        CreatioStatusBar.update("Error loading file!");
        throw vscode.FileSystemError.FileNotFound();
    }


    async initFileSystem() {
        if (this.client?.connected && this.client.connected) {
            CreatioStatusBar.animate("Loading files");
            this.folders = (await this.client.getPackages()).map(x => new Directory(x.name, x));
            if (this.folders.length === 0) {
                vscode.window.showErrorMessage("Something went wrong. No packages found");
                CreatioStatusBar.update("Error");
                return;
            }

            this.files = (await this.client.getWorkspaceItems()).map(x => new File(this.getFileWithExtension(x), x));
            if (this.files.length === 0) {
                vscode.window.showErrorMessage("Something went wrong. No schemas found");
                CreatioStatusBar.update("Error");
                return;
            }

            this.files = this.files.filter(x => {
                return this.getFileTypeEnabled(x.schemaMetaInfo.type);
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

    private getFileTypeEnabled(type: SchemaType) {
        switch (type) {
            case SchemaType.clientUnit:
                return this.config.get("fileTypes.ClientUnit.Enabled");
            case SchemaType.case:
                return this.config.get("fileTypes.Case.Enabled");
            case SchemaType.data:
                return this.config.get("fileTypes.Data.Enabled");
            case SchemaType.dll:
                return this.config.get("fileTypes.Dll.Enabled");
            case SchemaType.entity:
                return this.config.get("fileTypes.Entity.Enabled");
            case SchemaType.sourceCode:
                return this.config.get("fileTypes.SourceCode.Enabled");
            case SchemaType.sqlScript:
                return this.config.get("fileTypes.SqlScript.Enabled");
            case SchemaType.process:
                return this.config.get("fileTypes.Process.Enabled");
            case SchemaType.processUserTask:
                return this.config.get("fileTypes.ProcessUserTask.Enabled");
            default:
                return false;
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
            let extension = uri.split('.').pop();
            switch (extension) {
                case this.config.get("fileTypes.ClientUnit.Extension"):
                    return SchemaType.clientUnit;
                case this.config.get("fileTypes.SourceCode.Extension"):
                    return SchemaType.sourceCode;
                case this.config.get("fileTypes.ProcessUserTask.Extension"):
                    return SchemaType.processUserTask;
                case this.config.get("fileTypes.SqlScript.Extension"):
                    return SchemaType.sqlScript;
                case this.config.get("fileTypes.Entity.Extension"):
                    return SchemaType.entity;
                case this.config.get("fileTypes.Data.Extension"):
                    return SchemaType.data;
                case this.config.get("fileTypes.Process.Extension"):
                    return SchemaType.process;
                case this.config.get("fileTypes.Case.Extension"):
                    return SchemaType.case;
                default:
                    return SchemaType.unknown;
            }
        }

        return SchemaType.unknown;
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void | Thenable<void> {
        let file = this.files.find(x => this.getFilePath(x).path === uri.path);

        if (!file && options.create) {
            if (this.getFileTypeEnabled(this.getFileType(uri))) {
                // Create file
                // this._fireSoon({ type: vscode.FileChangeType.Created, uri });
                throw new Error("Not implemented");
            }
        }

        if (options.overwrite && file?.schema) {
            file.schema.body = content.toString();
            CreatioStatusBar.animate("Saving file");
            return this.client?.saveSchema(file.schema).then(response => {
                if (!response.success) {
                    vscode.window.showErrorMessage(response.errorInfo.message);
                    CreatioStatusBar.update("Error saving file");
                    return;
                } else {
                    this.writeToDisk(uri, content);
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

        if (this.client?.connected) {
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