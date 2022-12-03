import * as path from 'path';
import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import { Entry, File } from './fileSystemProvider';
import { ConfigHelper } from '../../common/configurationHelper';
import { isSchema, isWorkspaceItem, Schema, WorkSpaceItem } from '../../api/creatioTypes';

export class FileSystemHelper {
    static root: string;
    static getNameSpace(): vscode.Uri {
        return vscode.Uri.joinPath(vscode.Uri.file(this.getCacheFolder()), this.root);
    }

    static getPath(entry: Entry | WorkSpaceItem): vscode.Uri {
        if (entry instanceof File) {
            return vscode.Uri.joinPath(this.getNameSpace(), entry.workSpaceItem.packageName, this.withExtension(entry.workSpaceItem));
        } else if (isWorkspaceItem(entry)) {
            return vscode.Uri.joinPath(this.getNameSpace(), entry.name, this.withExtension(entry));
        } else {
            return vscode.Uri.joinPath(this.getNameSpace(), entry.name);
        }
    }

    static read(uri: vscode.Uri): File | undefined {
        var body: string | undefined = undefined;
        var file: any = undefined;

        if (fs.existsSync(this.getFullDataFilePath(uri))) {
            body = fs.readFileSync(this.getFullDataFilePath(uri), { encoding: 'utf8' });
        }

        if (fs.existsSync(this.getMetaDataFilePath(uri))) {
            file = JSON.parse(fs.readFileSync(this.getMetaDataFilePath(uri), { encoding: 'utf8' }));
            if (!file.schema) {
                file.schema = {};
            }
            if (body) {
                file.schema.body = body;
            }
            return Object.assign(new File("", {} as WorkSpaceItem), file) as File;
        } else {
            return undefined;
        }
    }

    static write(file: File) {
        let uri = this.getPath(file);
        let data = JSON.parse(JSON.stringify(file));
        if (!fs.existsSync(this.getDataFileFolder(uri))) {
            fs.mkdirSync(this.getDataFileFolder(uri), { recursive: true });
        }
        if (data.schema?.body) {
            fs.writeFileSync(this.getFullDataFilePath(uri), data.schema.body);
            data.schema.body = "";
        }
        if (!fs.existsSync(this.getMetaDataFileFolder(uri))) {
            fs.mkdirSync(this.getMetaDataFileFolder(uri), { recursive: true });
        }
        fs.writeFileSync(this.getMetaDataFilePath(uri), JSON.stringify(data));
    }

    static update(file: File) {
        let uri = this.getPath(file);
        let oldFile = this.read(uri);
        if (oldFile?.schema) {
            file.schema = oldFile.schema;
        }
        this.write(file);
    }

    static writeFiles(files: File[]) {
        files.forEach(file => {
            let uri = this.getPath(file);
            if (uri) {
                FileSystemHelper.write(file);
            }
        });
    }

    static clearFolder(folder: string, errCallback: fs.NoParamCallback = () => { }) {
        fs.rm(folder, { recursive: true }, errCallback);
    }

    static getBaseDir(uri: vscode.Uri): vscode.Uri {
        return uri.with({ path: path.posix.dirname(uri.path) });
    }



    static getDataFolder() {
        return path.dirname(this.getCacheFolder());
    }

    static getMetaDataFileFolder(uri: vscode.Uri): string {
        return path.join(this.getCacheFolder(), "cache", FileSystemHelper.root, path.basename(path.dirname(uri.path)));
    }
    
    static getDataFileFolder(uri: vscode.Uri): string {
        return path.dirname(uri.path).slice(1, path.dirname(uri.path).length);
    }

    static getMetaDataFilePath(uri: vscode.Uri): string {
        return this.getFullMetaDataFilePath(uri) + ".metadata.json";
    }

    static getFullMetaDataFilePath(uri: vscode.Uri): string {
        let filename = uri.toString().split('/').pop();
        if (!filename) { return ""; }
        return path.join(this.getMetaDataFileFolder(uri), filename);
    }

    static getFullDataFilePath(uri: vscode.Uri): string {
        let filename = uri.toString().split('/').pop();
        if (!filename) { return ""; }
        return path.join(this.getDataFileFolder(uri), filename);
    }

    static getCacheFolder(): string {
        return path.join(os.tmpdir(), "creatiocode");
    }


    static withExtension(workspaceItem: WorkSpaceItem): string {
        return workspaceItem.name + ConfigHelper.getExtension(workspaceItem.type);
    }
}
