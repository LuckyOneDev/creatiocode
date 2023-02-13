import * as path from 'path';
import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import { Entry, File } from './CreatioFileSystemProvider';
import { ConfigurationHelper } from '../../common/ConfigurationHelper';
import { isSchema, isWorkspaceItem, Schema, WorkSpaceItem } from '../../creatio-api/CreatioTypeDefinitions';

export class FileSystemHelper {
    root: string;
    constructor(root: string) {
        this.root = root;
    }

    getNameSpace(): vscode.Uri {
        return vscode.Uri.joinPath(vscode.Uri.parse("creatio:/"), this.root);
    }

    getPath(entry: Entry | WorkSpaceItem): vscode.Uri {
        if (entry instanceof File) {
            return vscode.Uri.joinPath(this.getNameSpace(), entry.workSpaceItem.packageName, this.withExtension(entry.workSpaceItem));
        } else if (isWorkspaceItem(entry)) {
            return vscode.Uri.joinPath(this.getNameSpace(), entry.name, this.withExtension(entry));
        } else {
            return vscode.Uri.joinPath(this.getNameSpace(), entry.name);
        }
    }

    /**
     * File is composed of two parts: metadata and body
     * @param uri 
     * @returns 
     */
    read(uri: vscode.Uri): File | undefined {
        let file: any = undefined;
        let body: string | undefined = undefined;

        // Check if the data file exists and read it
        const dataFilePath = this.getFullDataFilePath(uri);
        if (fs.existsSync(dataFilePath)) {
            body = fs.readFileSync(dataFilePath, { encoding: 'utf8' });
        }

        function isJSON(text: string): any {
            try {
                JSON.parse(text);
            } catch (e) {
                return false;
            }
            return true;
        }

        // Check if the metadata file exists and read it
        const metaDataFilePath = this.getMetaDataFilePathWithExtension(uri);
        if (fs.existsSync(metaDataFilePath)) {
            const metadataContent = fs.readFileSync(metaDataFilePath, { encoding: 'utf8' });

            if (isJSON(metadataContent)) {
                file = JSON.parse(metadataContent);
            } else {
                return undefined;
            }

            // Add the body to the schema if it exists
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


    write(file: File) {
        // Get the path and clone the file object
        const uri = this.getPath(file);
        const data = JSON.parse(JSON.stringify(file));

        // Create the data file folder if it doesn't exist
        const dataFileFolder = this.getDataFileFolder(uri);
        if (!fs.existsSync(dataFileFolder)) {
            fs.mkdirSync(dataFileFolder, { recursive: true });
        }

        // Write the body of the file to the data file
        if (data.schema?.body) {
            fs.writeFileSync(this.getFullDataFilePath(uri), data.schema.body);
            data.schema.body = "";
        }

        // Create the metadata file folder if it doesn't exist
        const metaDataFileFolder = this.getMetaDataFileFolder(uri);
        if (!fs.existsSync(metaDataFileFolder)) {
            fs.mkdirSync(metaDataFileFolder, { recursive: true });
        }

        // Write the metadata to the metadata file
        fs.writeFileSync(this.getMetaDataFilePathWithExtension(uri), JSON.stringify(data));
    }


    deleteDirectory(directoryPath: string) {
        fs.rmSync(directoryPath, { recursive: true, force: true });
    }

    update(file: File) {
        let uri = this.getPath(file);
        let oldFile = this.read(uri);
        if (oldFile?.schema) {
            file.schema = oldFile.schema;
        }
        this.write(file);
    }

    writeFiles(files: File[]) {
        files.forEach(file => {
            let uri = this.getPath(file);
            if (uri) {
                this.write(file);
            }
        });
    }

    withExtension(workspaceItem: WorkSpaceItem): string {
        return workspaceItem.name + ConfigurationHelper.getExtension(workspaceItem.type);
    }

    getBaseDir(uri: vscode.Uri): vscode.Uri {
        return uri.with({ path: path.posix.dirname(uri.path) });
    }

    // Path construction

    get cacheFolder(): string {
        return path.join(os.tmpdir(), "creatiocode");
    }

    getMetaDataFileFolder(uri: vscode.Uri): string {
        return path.join(this.cacheFolder, "cache", this.root, path.basename(path.dirname(uri.path)));
    }

    getDataFolder() {
        let p: string = "";
        let override = ConfigurationHelper.getCachePath();
        if (override && override !== "") {
            p = path.join(override, this.root);
        } else {
            p = path.join(this.cacheFolder, "data", this.root);
        }

        if (!fs.existsSync(p)) {
            fs.mkdirSync(p, { recursive: true });
        }
        return p;
    }

    getDataFileFolder(uri: vscode.Uri): string {
        return path.join(this.getDataFolder(), path.basename(path.dirname(uri.path)));
    }

    getBaseDataFileFolder(): string {
        // Create the folder if it doesn't exist
        const folderPath = path.join(this.cacheFolder, this.root);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        return folderPath;
    }

    getMetaDataFilePathWithExtension(uri: vscode.Uri): string {
        return `${this.getFullMetaDataFilePath(uri)}.metadata.json`;
    }

    getFullMetaDataFilePath(uri: vscode.Uri): string {
        // Get the filename from the URI
        const filename = uri.toString().split('/').pop();
        if (!filename) {
            return "";
        }
        return path.join(this.getMetaDataFileFolder(uri), filename);
    }

    getFullDataFilePath(uri: vscode.Uri): string {
        // Get the filename from the URI
        const filename = uri.toString().split('/').pop();
        if (!filename) {
            return "";
        }
        return path.join(this.getDataFileFolder(uri), filename);
    }
}
