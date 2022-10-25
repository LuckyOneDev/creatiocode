/* eslint-disable curly */
import * as path from 'path';
import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';

import { CreatioClient, PackageMetaInfo, Schema, SchemaMetaInfo, SchemaType } from './creatio-api';

export class File implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;
    name: string;
    schemaMetaInfo: SchemaMetaInfo;
    
    schema?: Schema;
    permissions?: vscode.FilePermission;

    constructor(name: string, schema: SchemaMetaInfo, ctime: number = Date.now(), mtime: number = Date.now(), size: number = 0) {
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
	async revertSchema(uri: vscode.Uri): Promise<void> {
        let file = this.files.find(x => this.getFilePath(x).path === uri.path);
        if (file?.schemaMetaInfo) {
            if (file?.schemaMetaInfo.isChanged) {
                vscode.window.showInformationMessage("Schema is being restored. Please wait...");
                let response = await this.client?.revertElements([file?.schemaMetaInfo]);
                if (response?.success) {
                    let schema = await this.client?.getSchema(file?.schemaMetaInfo.uId, file?.schemaMetaInfo.type);
                
                    if (schema && schema.body) {
                        this.writeToDisk(uri, schema.body);
                        await vscode.window.activeTextEditor?.edit((edit) => {
                            const document = vscode.window.activeTextEditor?.document;
                            edit.replace(new vscode.Range(
                                document!.lineAt(0).range.start,
                                document!.lineAt(document!.lineCount - 1).range.end
                            ), schema!.body);
                            vscode.window.showInformationMessage("Schema restored");
                        });
                    }
                } else {
                    vscode.window.showErrorMessage(JSON.stringify(response?.errorInfo));
                }
            } else {
                vscode.window.showErrorMessage("Schema is not changed!");
            }
        } else {
            vscode.window.showErrorMessage("Schema not found");
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

    private getDirectoryPath(dir: Directory): vscode.Uri {
        return vscode.Uri.parse(`creatio:/${dir.name}`);
    }

    private getBaseDir(uri: vscode.Uri): vscode.Uri {
        return uri.with({ path: path.posix.dirname(uri.path) });
    }

    private getFilePath(file: File): vscode.Uri {
        return vscode.Uri.parse(`creatio:/${file.schemaMetaInfo.packageName}/${this.getFileWithExtension(file.schemaMetaInfo)}`);
    }

    private getFileWithExtension(schema: SchemaMetaInfo): string {
        switch (schema.type) {
            case SchemaType.ClientUnit:
                return schema.name + this.config.get("fileTypes.ClientUnit.Extension");
            case SchemaType.SourceCode:
                return schema.name + this.config.get("fileTypes.SourceCode.Extension");
            case SchemaType.ProcessUserTask:
                return schema.name + this.config.get("fileTypes.ProcessUserTask.Extension");
            case SchemaType.SqlScript:
                return schema.name + this.config.get("fileTypes.SqlScript.Extension");
            case SchemaType.Entity:
                return schema.name + this.config.get("fileTypes.Entity.Extension");
            case SchemaType.Data:
                return schema.name + this.config.get("fileTypes.Data.Extension");
            case SchemaType.Process:
                return schema.name + this.config.get("fileTypes.Process.Extension");
            case SchemaType.Case:
                return schema.name + this.config.get("fileTypes.Case.Extension");
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
        if (!this.client?.credentials.url) throw Error();
        return this.getCacheFolder() + this.client.credentials.url + path.dirname(uri.path);
    }

    private writeToDisk(uri: vscode.Uri, data: string | NodeJS.ArrayBufferView) {
        let filename = uri.toString().split('/').pop();
        if (!this.client?.credentials.url) throw Error();
        if (!fs.existsSync(this.getSysFilePath(uri))) {
            fs.mkdirSync(this.getSysFilePath(uri), { recursive: true });
        }
        fs.writeFileSync(this.getSysFilePath(uri) + "/" + filename, data);
    }

    private readFromDisk(uri: vscode.Uri): Buffer | undefined {
        let filename = uri.toString().split('/').pop();
        if (!this.client?.credentials.url) throw vscode.FileSystemError.FileNotFound();
        try {
            return fs.readFileSync(this.getSysFilePath(uri) + "/" + filename);
        } catch (error) {
            return undefined;
        }
    }

    readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        let file = this.files.find(x => this.getFilePath(x).path === uri.path);
        if (file && this.client) {
            let data = this.readFromDisk(uri);
            if (!data) {
                return this.client.getSchema(file.schemaMetaInfo.uId, file.schemaMetaInfo.type).then(schema => {
                    if (schema) {
                        file!.schema = schema;
                        this.writeToDisk(uri, schema.body);
                        return Buffer.from(schema.body);
                    } else {
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
                        throw vscode.FileSystemError.FileNotFound();
                    }
                });
                return data;
            }
        }
        throw vscode.FileSystemError.FileNotFound();
    }


    async initFileSystem() {
        if (this.client?.connected && this.client.connected) {
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

            vscode.window.showInformationMessage("Files loaded...");
        } else {
            this.reconnectDialouge();
        }
    }

    private getFileTypeEnabled(type: SchemaType) {
        switch (type) {
            case SchemaType.ClientUnit:
                return this.config.get("fileTypes.ClientUnit.Enabled");
            case SchemaType.Case:
                return this.config.get("fileTypes.Case.Enabled");
            case SchemaType.Data:
                return this.config.get("fileTypes.Data.Enabled");
            case SchemaType.Dll:
                return this.config.get("fileTypes.Dll.Enabled");
            case SchemaType.Entity:
                return this.config.get("fileTypes.Entity.Enabled");
            case SchemaType.SourceCode:
                return this.config.get("fileTypes.SourceCode.Enabled");
            case SchemaType.SqlScript:
                return this.config.get("fileTypes.SqlScript.Enabled");
            case SchemaType.Process:
                return this.config.get("fileTypes.Process.Enabled");
            case SchemaType.ProcessUserTask:
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
                return SchemaType.Unknown;
            }
        }

        if (uri instanceof String) {
            let extension = uri.split('.').pop();
            switch (extension) {
                case this.config.get("fileTypes.ClientUnit.Extension"):
                    return SchemaType.ClientUnit;
                case this.config.get("fileTypes.SourceCode.Extension"):
                    return SchemaType.SourceCode;
                case this.config.get("fileTypes.ProcessUserTask.Extension"):
                    return SchemaType.ProcessUserTask;
                case this.config.get("fileTypes.SqlScript.Extension"):
                    return SchemaType.SqlScript;
                case this.config.get("fileTypes.Entity.Extension"):
                    return SchemaType.Entity;
                case this.config.get("fileTypes.Data.Extension"):
                    return SchemaType.Data;
                case this.config.get("fileTypes.Process.Extension"):
                    return SchemaType.Process;
                case this.config.get("fileTypes.Case.Extension"):
                    return SchemaType.Case;
                default:
                    return SchemaType.Unknown;
            }
        }

        return SchemaType.Unknown;
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void | Thenable<void> {
        let file = this.files.find(x => this.getFilePath(x).path === uri.path);

        if (!file && options.create) {
            if (this.getFileTypeEnabled(this.getFileType(uri))) {
                // Create file
                // this._fireSoon({ type: vscode.FileChangeType.Created, uri });
                throw new Error("Not implemented");
            }
        } else if (options.overwrite) {
            if (file?.schema) {
                file.schema.body = content.toString();
                vscode.window.showInformationMessage("File is saving...");
                return this.client?.saveSchema(file.schema).then(response => {
                    if (!response?.errorInfo) {
                        this.writeToDisk(uri, content);
                        this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
                        file!.schemaMetaInfo.isChanged = true;
                        vscode.window.showInformationMessage("File saved");
                    } else {
                        throw vscode.FileSystemError.FileNotFound();
                    }
                });   
            } else {
                throw vscode.FileSystemError.FileNotFound();
            }
        }
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