import * as path from 'path';
import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import { Entry, File } from './fileSystemProvider';
import { ConfigHelper } from '../common/configurationHelper';
import { Schema, WorkSpaceItem } from '../api/creatioTypes';

export class FileSystemHelper {
    static root: string;
    static getPath(entry: Entry): vscode.Uri {
        if (entry instanceof File) {
            return vscode.Uri.parse(`creatio:/${entry.workSpaceItem.packageName}/${this.withExtension(entry.workSpaceItem)}`);
        } else {
            return vscode.Uri.parse(`creatio:/${entry.name}`);
        }
    }

    static read(uri: vscode.Uri): Buffer | undefined {
        if (fs.existsSync(this.getFullFilePath(uri))) {
            return fs.readFileSync(this.getFullFilePath(uri));
        } else {
            return undefined;
        }
    }

    static writeFiles(schemas: File[]) {
        schemas.forEach(x => {
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

    static write(uri: vscode.Uri, data: Object) {
        if (!fs.existsSync(this.getSysFilePath(uri))) {
            fs.mkdirSync(this.getSysFilePath(uri), { recursive: true });
        }
        fs.writeFileSync(this.getFullFilePath(uri), JSON.stringify(data));
    }

    static getSysFilePath(uri: vscode.Uri): string {
        return path.join(this.getCacheFolder(), FileSystemHelper.root, path.dirname(uri.path));
    }

    static getFullFilePath(uri: vscode.Uri): string {
        let filename = uri.toString().split('/').pop();
        if (!filename) { return ""; }
        return uri.fsPath;
    }

    static getCacheFolder(): string {
        return path.join(os.tmpdir(), "/creatiocode/");
    }


    static withExtension(schema: WorkSpaceItem): string {
        return schema.name + ConfigHelper.getExtension(schema.type);
    }
}
