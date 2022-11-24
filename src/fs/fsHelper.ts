import * as path from 'path';
import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import { Entry, File } from './fileSystemProvider';
import { ConfigHelper } from '../common/configurationHelper';
import { isSchema, isWorkspaceItem, Schema, WorkSpaceItem } from '../api/creatioTypes';

export class FileSystemHelper {
    static root: string;

    static getPath(entry: Entry | WorkSpaceItem): vscode.Uri {
        if (entry instanceof File) {
            return vscode.Uri.parse(`creatio:/${entry.workSpaceItem.packageName}/${this.withExtension(entry.workSpaceItem)}`);
        } else if (isWorkspaceItem(entry)) {
            return vscode.Uri.parse(`creatio:/${entry.name}/${this.withExtension(entry)}`);
        } else {
            return vscode.Uri.parse(`creatio:/${entry.name}`);
        }
    }

    static read(uri: vscode.Uri): File | undefined {
        var body: string | undefined = undefined;
        var file: any = undefined;

        if (fs.existsSync(this.getFullFilePath(uri))) {
            body = fs.readFileSync(this.getFullFilePath(uri), { encoding: 'utf8' });
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

    static write(uri: vscode.Uri, file: File) {
        let data = JSON.parse(JSON.stringify(file));
        if (!fs.existsSync(this.getFileFolder(uri))) {
            fs.mkdirSync(this.getFileFolder(uri), { recursive: true });
        }
        if (data.schema?.body) {
            fs.writeFileSync(this.getFullFilePath(uri), data.schema.body);
            data.schema.body = "";
        }
        fs.writeFileSync(this.getMetaDataFilePath(uri), JSON.stringify(data));
    }

    static writeFiles(files: File[]) {
        files.forEach(x => {
            let uri = this.getPath(x);
            if (uri) {
                FileSystemHelper.write(uri, x);
            }
        });
    }

    static clearFolder(folder: string, errCallback: fs.NoParamCallback) {
        fs.rmdir(folder, { recursive: true }, errCallback);
    }

    static getBaseDir(uri: vscode.Uri): vscode.Uri {
        return uri.with({ path: path.posix.dirname(uri.path) });
    }

    static getFileFolder(uri: vscode.Uri): string {
        return path.join(this.getCacheFolder(), FileSystemHelper.root, path.dirname(uri.path));
    }

    static getMetaDataFilePath(uri: vscode.Uri): string {
        return this.getFullFilePath(uri) + ".metadata.json";
    }

    static getFullFilePath(uri: vscode.Uri): string {
        let filename = uri.toString().split('/').pop();
        if (!filename) { return ""; }
        return path.join(this.getFileFolder(uri), filename);
    }

    static getCacheFolder(): string {
        return path.join(os.tmpdir(), "/creatiocode/");
    }


    static withExtension(workspaceItem: WorkSpaceItem): string {
        return workspaceItem.name + ConfigHelper.getExtension(workspaceItem.type);
    }
}
