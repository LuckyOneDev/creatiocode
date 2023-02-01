import * as vscode from 'vscode';
import { CreatioClient } from '../../creatio-api/CreatioClient';
import { PackageMetaInfo, Schema, WorkSpaceItem, SchemaType } from '../../creatio-api/CreatioTypeDefinitions';
import { ConfigurationHelper } from '../../common/ConfigurationHelper';
import { FileSystemHelper } from './FileSystemHelper';
import { CreatioCodeUtils } from '../../common/CreatioCodeUtils';
import { CreatioExplorer, CreatioExplorerDecorationProvider, CreatioExplorerItem } from './CreatioExplorer';
import { PushToSVNPanel } from '../SVN/PushSVNPanel';
import { SimplePanel } from '../Intellisense/SimplePanel/simplepanel';

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

export class CreatioFileSystemProvider implements vscode.FileSystemProvider {
    // Singleton    
    fsHelper: FileSystemHelper;
    context?: vscode.ExtensionContext;

    private constructor(root: string) {
        this.fsHelper = new FileSystemHelper(root);
    }
    private static instance: CreatioFileSystemProvider;
    public static getInstance(): CreatioFileSystemProvider {
        if (!CreatioFileSystemProvider.instance) {
            CreatioFileSystemProvider.instance = new CreatioFileSystemProvider("");
        }
        return CreatioFileSystemProvider.instance;
    }

    createTableString(tableData: Array<Array<string>>): string {
        var result = "<table>";
        for (var i = 0; i < tableData.length; i++) {
            result += "<tr>";
            for (var j = 0; j < tableData[i].length; j++) {
                result += "<td>" + tableData[i][j] + "</td>";
            }
            result += "</tr>";
        }
        result += "</table>";
        return result;
    }

    commit(packageName: string, message: any) {
        vscode.window.withProgress({
            "location": vscode.ProgressLocation.Notification,
            "title": "Loading diff"
        }, async (progress, token) => {
            let response = await this.client?.commit(packageName, message);
            if (response?.success && response?.commitResult === 0) {
                vscode.window.showInformationMessage(response.commitResultName);
            } else if (response?.commitResult !== 0) {
                vscode.window.showErrorMessage(response!.commitResultName);
            }
        });
    }

    build() {
        vscode.window.withProgress(
            {
                "location": vscode.ProgressLocation.Notification,
                "title": "Compiling"
            }, async (progress, token) => {
                let response = await this.client?.build();
                if (!response?.success && response?.errors) {
                    CreatioCodeUtils.createYesNoDialouge(`Build failed with ${response.errors.length} errors. Show errors?`, () => {
                        let tableArray = new Array<Array<string>>();
                        tableArray.push(["File", "Line", "Column", "Code", "Error"]);
                        response!.errors!.forEach(error => {
                            tableArray.push([error.fileName, error.line, error.column, error.errorNumber, error.errorText]);
                        });
                        let style = `
                        <style>
                            table {
                                width: 100%;
                            }

                            table, th, td {
                                border: 1px solid;
                                text-align: center;
                                border-collapse: collapse;
                            }

                            th, td {
                                padding: 5px;
                            }
                        </style>`;
                        let panel = new SimplePanel(this.context!, `Build errors ${new Date(Date.now()).toISOString()}`, style + this.createTableString(tableArray));
                        panel.createPanel();
                    });

                } else if (response?.message) {
                    vscode.window.showInformationMessage(response?.message);
                } else {
                    vscode.window.showInformationMessage("Build completed");
                }
            });
    }

    rebuild() {
        vscode.window.withProgress(
            {
                "location": vscode.ProgressLocation.Notification,
                "title": "Compiling"
            }, async (progress, token) => {
                let response = await this.client?.rebuild();
                if (!response?.success && response?.errors) {
                    CreatioCodeUtils.createYesNoDialouge(`Build failed with ${response.errors.length} errors. Show errors?`, () => {
                        let tableArray = new Array<Array<string>>();
                        tableArray.push(["File", "Line", "Column", "Code", "Error"]);
                        response!.errors!.forEach(error => {
                            tableArray.push([error.fileName, error.line, error.column, error.errorNumber, error.errorText]);
                        });
                        let style = `
                        <style>
                            table {
                                width: 100%;
                            }

                            table, th, td {
                                border: 1px solid;
                                text-align: center;
                                border-collapse: collapse;
                            }

                            th, td {
                                padding: 5px;
                            }
                        </style>`;
                        let panel = new SimplePanel(this.context!, `Build errors ${new Date(Date.now()).toISOString()}`, style + this.createTableString(tableArray));
                        panel.createPanel();
                    });

                } else if (response?.message) {
                    vscode.window.showInformationMessage(response?.message);
                } else {
                    vscode.window.showInformationMessage("Build completed");
                }
            });
    }

    generateChanges(resourceUri: vscode.Uri, context: vscode.ExtensionContext) {
        vscode.window.withProgress(
            {
                "location": vscode.ProgressLocation.Notification,
                "title": "Loading diff"
            }, async (progress, token) => {
                let memDir = this.getMemFolder(resourceUri);
                if (!memDir || !memDir.package) { return; }
                let changes = await this.client?.generateChanges(memDir.package.name);
                return changes;
            }).then(changes => {
                if (changes) {
                    // Open webview
                    let panel = new PushToSVNPanel(context, this.getMemFolder(resourceUri)!.package!.name, changes[0]);
                    panel.createPanel();
                } else {
                    vscode.window.showErrorMessage("Changes could not be generated");
                }
            });
    }

    reloadFile(resourceUri: vscode.Uri) {
        vscode.window.withProgress(
            {
                "location": vscode.ProgressLocation.Notification,
                "title": "Reloading schema"
            }, async (progress, token) => {
                const inMemFile = this.getMemFile(resourceUri);
                if (!inMemFile) { return; }
                let schema = await this.client!.getSchema(inMemFile.workSpaceItem.uId, inMemFile.workSpaceItem.type);
                if (schema) {
                    inMemFile.schema = schema;
                    this.fsHelper.write(inMemFile);
                    this.changeMemFile(resourceUri, inMemFile);
                } else {
                    throw vscode.FileSystemError.FileNotFound();
                }
            });
    }

    unlockSchema(resourceUri: vscode.Uri) {
        if (!this.client) { return; }
        const memFile = this.getMemFile(resourceUri);
        if (!memFile?.workSpaceItem) { return; }
        vscode.window.withProgress(
            {
                "location": vscode.ProgressLocation.Notification,
                "title": "Unlocking schema"
            },
            async (progress, token) => {
                let response = await this.client!.unlockSchema([memFile?.workSpaceItem]);
                if (response && response.success) {
                    memFile.workSpaceItem.isLocked = false;
                    await this.changeMemFile(resourceUri, memFile);
                    this._fireSoon({ type: vscode.FileChangeType.Changed, uri: resourceUri });
                    // vscode.window.showInformationMessage("Schema unlocked");
                }
            }
        );
    }

    lockSchema(resourceUri: vscode.Uri) {
        if (!this.client) { return; }
        const memFile = this.getMemFile(resourceUri);
        if (!memFile?.workSpaceItem) { return; }
        vscode.window.withProgress(
            {
                "location": vscode.ProgressLocation.Notification,
                "title": "Locking schema"
            },
            async (progress, token) => {
                let response = await this.client!.lockSchema([memFile?.workSpaceItem]);
                if (response && response.success) {
                    memFile.workSpaceItem.isLocked = true;
                    await this.changeMemFile(resourceUri, memFile);
                    this._fireSoon({ type: vscode.FileChangeType.Changed, uri: resourceUri });
                    // vscode.window.showInformationMessage("Schema locked");
                }
            }
        );
    }

    getUriByName(docName: string): vscode.Uri[] {
        let files = this.files.filter(x => x.name === `${docName}${ConfigurationHelper.getExtension(SchemaType.clientUnit)}`);
        return files.map(x => this.fsHelper.getPath(x));
    }

    getSchemaUri(uId: string): vscode.Uri {
        let file = this.files.find(x => x.workSpaceItem.uId === uId);
        if (!file) {
            throw new Error("Schema not found");
        }
        return this.fsHelper.getPath(file);
    }

    restoreSchema(uri: vscode.Uri) {
        let memFile = this.getMemFile(uri);
        if (memFile && memFile?.workSpaceItem) {
            if (memFile.workSpaceItem.isChanged) {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Restoring schema"
                }, async (progress, token) => {
                    let response = await this.client?.revertElements([memFile!.workSpaceItem]);
                    if (!response?.success) {
                        vscode.window.showErrorMessage(JSON.stringify(response?.errorInfo));
                        return;
                    }

                    let file = await this.read(uri, true);

                    if (file.schema) {
                        await this.changeMemFile(uri, file);

                        progress.report({
                            increment: 100,
                            message: "Schema restored"
                        });

                        memFile!.workSpaceItem.isChanged = false;
                        memFile!.workSpaceItem.isLocked = false;
                        this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
                    }
                });
            } else {
                vscode.window.showErrorMessage("Schema is not changed!");
            }
        } else {
            vscode.window.showErrorMessage("Schema not found");
        }
    }

    clearCache() {
        CreatioCodeUtils.createYesNoDialouge("Delete all downloaded files?", () => {
            this.fsHelper.deleteDirectory(this.fsHelper.cacheFolder);
            this.files = [];
            this.folders = [];
            CreatioExplorer.getInstance().refresh();
        });
    }

    cacheFolder(folder: vscode.Uri): Promise<void> {
        return new Promise((resolve, reject) => {
            CreatioCodeUtils.createYesNoDialouge("Download package?", async () => {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    cancellable: true,
                }, async (progress, token) => {
                    progress.report({
                        message: `Downloading package '${folder.path}'`,
                    });
                    let files = this.getDirectoryContents(folder);

                    for (const iterator of files) {
                        if (token.isCancellationRequested) {
                            break;
                        }
                        await this.read(this.fsHelper.getPath(iterator), true);
                        progress.report({
                            message: `Downloading package: '${folder.path}' file: ${iterator.name}`,
                            increment: 100 / files.length
                        });
                        resolve();
                    }
                });
            });
        });
    }

    folders: Directory[] = [];
    files: File[] = [];
    root = new Directory('/');

    client: CreatioClient | null = null;

    stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        if (uri.path === "/") {
            return this.root;
        }

        let folder = this.folders.find(x => this.fsHelper.getPath(x).path === uri.path);
        if (folder) {
            return folder;
        }

        let file = this.getMemFile(uri);
        if (file) {
            return file;
        } else {
            return new Promise<vscode.FileStat>(resolve => {
                CreatioCodeUtils.createReconnectDialouge(() => {
                    resolve(this.stat(uri));
                });
            });
        }
    }

    getDirectoryContents(uri: vscode.Uri): Entry[] {
        const pack = this.folders.find(x => this.fsHelper.getPath(x).path === uri.path);
        if (pack?.package) {
            return this.files.filter(x => x?.workSpaceItem.packageUId === pack.package?.uId);
        } else {
            throw vscode.FileSystemError.FileNotFound();
        }
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        if (uri.path === "/") {
            return this.folders.map(x => [x.name, vscode.FileType.Directory]);
        }
        let content = this.getDirectoryContents(uri);
        return content.map(x => [x.name, x.type]);
    }

    async getParentFiles(file: File, token: vscode.CancellationToken): Promise<{ files: Array<File>, cancelled: boolean }> {
        let items = [] as Array<File>;
        if (this.client) {
            // Ensure loaded
            let first = await this.read(this.fsHelper.getPath(file));
            if (first) {
                items.push(first);
                // @ts-ignore
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
        // @ts-ignore
        let root = files.find(x => x.schema?.parent.uId === undefined);
        if (!root) {
            throw new Error("Root schema not found");
        }

        orderedFiles.push(root);

        for (let i = 0; i < files.length; i++) {
            // @ts-ignore
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
        return this.files.find(x => this.fsHelper.getPath(x).path === uri.path);
    }

    getMemFolder(uri: vscode.Uri): Directory | undefined {
        return this.folders.find(x => this.fsHelper.getPath(x).path === uri.path);
    }

    private async changeMemFile(uri: vscode.Uri, file: File) {
        const index = this.files.findIndex(x => this.fsHelper.getPath(x).path === uri.path);
        this.files[index] = file;

        if (file.schema && file.schema.body) {
            vscode.window.visibleTextEditors.filter(x => x.document.uri.path === uri.path).forEach((editor) => {
                const document = vscode.window.activeTextEditor?.document;
                editor.edit(edit => {
                    edit.replace(new vscode.Range(
                        document!.lineAt(0).range.start,
                        document!.lineAt(document!.lineCount - 1).range.end
                        // @ts-ignore
                    ), file.schema!.body.toString());
                });
            });
        }

        this._fireSoon({
            type: vscode.FileChangeType.Changed,
            uri: uri
        });
    }

    /**
     * Reads file from disk or server.
     * Caches file on disk.
     * @param uri 
     * @param silent 
     * @returns 
     */
    private async read(uri: vscode.Uri, silent: boolean = false): Promise<File> {
        if (!this.client) {
            return CreatioCodeUtils.createReconnectDialouge(this.read.bind(this, uri, silent));
        }

        let inMemFile = this.files.find(file => this.fsHelper.getPath(file).path === uri.path);
        if (!inMemFile) {
            throw vscode.FileSystemError.FileNotFound();
        }

        // Try to read from disk
        let localFile = this.fsHelper.read(uri);

        if (localFile && localFile.isLoaded() && !silent) {
            if (ConfigurationHelper.isCarefulMode()) {
                // File is fully loaded. Comparing to server version
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: "Comparing to server version",
                }, async (progress) => {
                    await this.client!.getSchema(localFile!.workSpaceItem.uId, localFile!.workSpaceItem.type).then(async (schema) => {
                        if (schema) {
                            if (JSON.stringify(schema.body) !== JSON.stringify(localFile!.schema?.body)) {
                                CreatioCodeUtils.createYesNoDialouge(`File on server is different from local. Pull ${schema.name} from server?`, () => {
                                    localFile!.schema = schema;
                                    this.changeMemFile(uri, localFile!);
                                });
                            }
                        } else {
                            throw vscode.FileSystemError.FileNotFound();
                        }
                        this._fireSoon({
                            type: vscode.FileChangeType.Changed,
                            uri: uri
                        });
                    });
                });


            }
            return localFile;
        } else {
            // File is not loaded
            let schema = await this.client!.getSchema(inMemFile.workSpaceItem.uId, inMemFile.workSpaceItem.type);
            if (schema) {
                inMemFile.schema = schema;
                this.fsHelper.write(inMemFile);
                return inMemFile;
            } else {
                throw vscode.FileSystemError.FileNotFound();
            }
        }
    }

    readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        return new Promise((resolve, reject) => {
            if (uri.path.includes(".vscode")) {
                resolve(new Uint8Array()); // insert vscode settings here
                return;
            }

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Loading file"
            }, async (progress, token) => {
                this.read(uri).then(file => {
                    if (file) {
                        if (file.schema && file.schema.body) {
                            resolve(Buffer.from(file.schema!.body));
                        }
                        progress.report({
                            increment: 100,
                            message: "File loaded"
                        });
                    } else {
                        vscode.window.showErrorMessage("File not found");
                        reject(vscode.FileSystemError.FileNotFound());
                    }
                });
            });
        });
    }

    public isReloading: boolean = false;

    async reload() {
        if (this.isReloading === false) {
            this.isReloading = true;

            this.files = [];
            this.folders = [];
            CreatioExplorer.getInstance().refresh();

            if (this.client && this.client.isConnected()) {
                this.fsHelper.root = this.client.connectionInfo.getHostName();

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Loading files",
                    cancellable: true
                }, async (progress, token) => {

                    progress.report({
                        increment: 25,
                        message: "Getting packages"
                    });

                    this.folders = (await this.client!.getPackages()).map(x => new Directory(x.name, x));
                    if (this.folders.length === 0) {
                        vscode.window.showErrorMessage("No available packages found");
                        return;
                    }

                    if (token.isCancellationRequested) { return; }

                    progress.report({
                        increment: 25,
                        message: "Getting Workspace Items"
                    });

                    this.files = (await this.client!.getWorkspaceItems()).map(x => new File(this.fsHelper.withExtension(x), x));
                    if (this.files.length === 0) {
                        vscode.window.showErrorMessage("No available schemas found");
                        return;
                    }

                    progress.report({
                        increment: 25,
                        message: "Forming workspace"
                    });

                    this.files = this.files.filter(x => {
                        return ConfigurationHelper.isFileTypeEnabled(x.workSpaceItem.type);
                    });

                    this.folders.forEach(element => {
                        const uri = this.fsHelper.getPath(element);
                        const baseDir = this.fsHelper.getBaseDir(uri);

                        this._fireSoon(
                            { type: vscode.FileChangeType.Changed, uri: baseDir },
                            { type: vscode.FileChangeType.Created, uri: uri }
                        );
                    });

                    this.files.forEach(file => {
                        file.mtime = Date.now();
                        // this.fsHelper.update(file);
                        this._fireSoon({
                            type: vscode.FileChangeType.Created,
                            uri: this.fsHelper.getPath(file)
                        });
                    });

                    // Fix to update opened files
                    vscode.window.visibleTextEditors.forEach(editor => {
                        if (editor.document.uri.scheme === "creatio") {
                            this._fireSoon({
                                type: vscode.FileChangeType.Changed,
                                uri: editor.document.uri
                            });
                        }
                    });

                    progress.report({
                        increment: 25,
                        message: "Filesystem loaded"
                    });
                });

            }
            this.isReloading = false;
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
            ConfigurationHelper.getSchemaTypeByExtension(uri.toString());
        }
        return SchemaType.unknown;
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void | Thenable<void> {
        let file: any = this.fsHelper.read(uri);
        // Local save
        if (file && file.schema) {
            file.schema.body = content.toString();
            this.fsHelper.write(file);
        }

        if (!file && options.create) {
            if (ConfigurationHelper.isFileTypeEnabled(this.getFileType(uri))) {
                // Create file
                // this._fireSoon({ type: vscode.FileChangeType.Created, uri });
                throw new Error("Not implemented");
            }
        }

        if (options.overwrite) {
            file.schema.body = content.toString();
            return this.save(uri, file);
        }

        throw vscode.FileSystemError.FileNotFound();
    }

    async save(uri: vscode.Uri, file: File): Promise<void> {
        if (!file.schema) {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Saving file"
        }, async (progress, token) => {
            const response = await this.client?.saveSchema(file.schema!, file.workSpaceItem.type);
            if (!response) {
                vscode.window.showErrorMessage("Error saving file");
            } else {
                progress.report({
                    increment: 100,
                    message: "File saved"
                });

                let memFile = this.getMemFile(uri);
                memFile!.mtime = Date.now();
                memFile!.workSpaceItem.isChanged = true;
                memFile!.workSpaceItem.isLocked = true;
                this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
            }
        });
    }

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        vscode.window.showInformationMessage("Renaming is not supported");
        throw new Error("Not implemented");
    }

    delete(uri: vscode.Uri): void {
        vscode.window.showInformationMessage("Package deletion is not supported. Please use web interface.");
        // let file = this.getMemFile(uri);
        // if (this.client && this.client.isConnected()) {
        //     if (file) {
        //         this.client.deleteSchema([file.workSpaceItem.id]);
        //         this._fireSoon({ type: vscode.FileChangeType.Deleted, uri });
        //     } else {
        //         vscode.window.showInformationMessage("Package deletion is not supported. Please use web interface.");
        //     }
        // }
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