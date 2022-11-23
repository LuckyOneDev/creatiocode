import * as vscode from 'vscode';
import { CreatioClient } from '../api/creatioClient';
import { PackageMetaInfo, Schema, WorkSpaceItem, SchemaType } from '../api/creatioTypes';
import { CreatioStatusBar } from '../common/statusBar';
import { ConfigHelper } from '../common/configurationHelper';
import { FileSystemHelper } from './fsHelper';
import { CreatioCodeUtils } from '../common/utils';

export class File implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;
    name: string;

    workSpaceItem: WorkSpaceItem;
    schema?: Schema;

    permissions?: vscode.FilePermission;

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
        return files.map(x => FileSystemHelper.getPath(x));
	}

    getSchemaUri(uId: string): vscode.Uri | undefined {
        let file = this.files.find(x => x.workSpaceItem.uId === uId);
        return file?.workSpaceItem.uId ? FileSystemHelper.getPath(file) : undefined;
    }

    async replaceSchema(uri: vscode.Uri, schema: Schema): Promise<boolean> {
        if (schema && schema.body) {
            FileSystemHelper.write(uri, schema.body);
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
        let file = this.files.find(x => FileSystemHelper.getPath(x).path === uri.path);
        if (file?.workSpaceItem) {
            if (file.workSpaceItem.isChanged) {
                CreatioStatusBar.animate("Restoring schema");
                let response = await this.client?.revertElements([file?.workSpaceItem]);
                if (response?.success) {
                    let schema = await this.client?.getSchema(file?.workSpaceItem.uId, file?.workSpaceItem.type);

                    if (schema && schema.body) {
                        FileSystemHelper.write(uri, schema);
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
                    
                }
            });
        });
    }

    async cacheFolder(folder: vscode.Uri): Promise<void> {
        if (folder.path === "/") {
            return;
        }
        
        CreatioCodeUtils.createYesNoDialouge("Download package?", async () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
              }, 
              async (progress) => {
                progress.report({
                  message: `Downloading package '${folder.path}' ...`,
                });

                let files = this.readDirectory(folder);
                let a = files.map(async x => {
                    // await this.readFile(vscode.Uri.file(FileSystemHelper.getFullFilePath(x)));
                });
                await Promise.all(a);
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

        let file = this.files.find(x => FileSystemHelper.getPath(x).path === uri.path);
        if (file) {
            return file;
        }

        throw vscode.FileSystemError.FileNotFound();
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

    

    getFile(uri: vscode.Uri): File | undefined {
        return this.files.find(x => FileSystemHelper.getPath(x).path === uri.path);
    }

    // private readFileClient(uri: vscode.Uri, local: boolean): Uint8Array | Thenable<Uint8Array> {
    //     let file = this.files.find(x => FileSystemHelper.getPath(x).path === uri.path);
    //     if (file && this.client) {
    //         let data = FileSystemHelper.read(uri);
    //         if (!local) {CreatioStatusBar.animate("Loading file...");}
    //         if (!data) {
    //             return this.client.getSchema(file.workSpaceItem.uId, file.workSpaceItem.type).then(schema => {
    //                 if (schema) {
    //                     file!.schema = schema;
    //                     this.writeToDisk(uri, schema.body);
    //                     if (!local) {CreatioStatusBar.update("File loaded");}
    //                     return Buffer.from(schema.body);
    //                 } else {
    //                     if (!local) {CreatioStatusBar.update("Error loading file!");}
    //                     throw vscode.FileSystemError.FileNotFound();
    //                 }
    //             });
    //         } else if (!local) {
    //             this.client.getSchema(file.workSpaceItem.uId, file.workSpaceItem.type).then(schema => {
    //                 if (schema) {
    //                     file!.schema = schema;
    //                     if (data?.toString() !== schema.body) {
    //                         vscode.window.showInformationMessage("File on server is different from local file. Update local file?", "Yes", "No").then(async (value) => {
    //                             if (value && value === "Yes") {
    //                                 FileSystemHelper.write(uri, schema.body);
    //                                 this._fireSoon(
    //                                     {
    //                                         type: vscode.FileChangeType.Changed,
    //                                         uri: uri
    //                                     });
    //                                 await vscode.window.activeTextEditor?.edit((edit) => {
    //                                     const document = vscode.window.activeTextEditor?.document;
    //                                     edit.replace(new vscode.Range(
    //                                         document!.lineAt(0).range.start,
    //                                         document!.lineAt(document!.lineCount - 1).range.end
    //                                     ), schema.body.toString());
    //                                 });

    //                                 vscode.window.showInformationMessage("File updated");
    //                             }
    //                         });
    //                     }
    //                 } else {
    //                     CreatioStatusBar.update("Error loading file!");
    //                     throw vscode.FileSystemError.FileNotFound();
    //                 }
    //             });
    //             CreatioStatusBar.update("File loaded");
    //             return data;
    //         }
    //     }
    //     if (!local) {CreatioStatusBar.update("Error loading file!");}
    //     throw vscode.FileSystemError.FileNotFound();
    // }

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

            this.files.forEach(element => {
                element.mtime = Date.now();
                this._fireSoon(
                    {
                        type: vscode.FileChangeType.Created,
                        uri: FileSystemHelper.getPath(element)
                    });
                FileSystemHelper.write(FileSystemHelper.getPath(element), element);
            });

            CreatioStatusBar.update("Filesystem loaded");
        } else {
            CreatioCodeUtils.createReconnectDialouge(this.initFileSystem.bind(this));
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
        FileSystemHelper.write(uri, content);
        let file = this.files.find(x => FileSystemHelper.getPath(x).path === uri.path);

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
                    file!.workSpaceItem.isChanged = true;
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
        let file = this.files.find(x => FileSystemHelper.getPath(x).path === uri.path);

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