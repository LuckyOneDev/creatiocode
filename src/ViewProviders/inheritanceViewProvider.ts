import * as vscode from 'vscode';
import { CreatioFS } from '../fs/fileSystemProvider';
import { Schema, WorkSpaceItem } from '../api/creatioTypes';
import { WorkspaceItemViewProvider } from './common/workspaceItemViewProvider';
import { FileSystemHelper } from '../fs/fsHelper';

export class InheritanceViewProvider extends WorkspaceItemViewProvider {
    scripts = ['inheritanceView.js'];
    styles = ['loader.css', 'inheritanceView.css'];

    loading?: Promise<void>;
    loadedSchema?: WorkSpaceItem;
    cancelationTokenSource = new vscode.CancellationTokenSource();

    schemas?: Schema[];

    protected onDidReceiveMessage(message: any): void {
        switch (message.command) {
            case 'openSchema':
                let uri = CreatioFS.getInstance().getSchemaUri(message.id);
                vscode.workspace.openTextDocument(uri!).then(document => {
                    vscode.window.showTextDocument(document);
                });
                break;
            case 'getCurrentSchema':
                this.postMessage(this.currentShema?.uId);
                break;
        }

    }

    protected async getParentSchemas(workSpaceItem: WorkSpaceItem, token: vscode.CancellationToken): Promise<{ schemas: Array<Schema>, cancelled: boolean }> {
        let items = [];
        let client = CreatioFS.getInstance().client;

        let alikeSchemas = CreatioFS.getInstance().getUriByName(workSpaceItem.name);

        if (client) {
            let loadedSchemas = alikeSchemas.map(async uri => {
                if (!token.isCancellationRequested) {
                    return await CreatioFS.getInstance().getFile(uri);
                }
            });

            if (token.isCancellationRequested) {
                return {
                    schemas: [],
                    cancelled: token.isCancellationRequested
                }; 
            }

            // let first = await client.getSchema(workSpaceItem.uId, workSpaceItem.type);
            if (first) {
                items.push(first);
                while (items[items.length - 1].parent && token.isCancellationRequested === false) {
                    let current: any = items[items.length - 1];
                    let newSchema: Schema | null = await client.getSchema(current.parent.uId, workSpaceItem.type);
                    if (newSchema) {
                        items.push(newSchema);
                    } else {
                        break;
                    }
                }
            }
        }
        return {
            schemas: items,
            cancelled: token.isCancellationRequested
        };
    }

    protected getBody(): string {
        if (!this.currentShema) {
            return "Schema not selected";
        }   

        if (this.schemas && this.schemas.findIndex(x => x.uId === this.currentShema?.uId) !== -1) {
            return this.buildInheritanceTree();
        } else {
            this.cancelationTokenSource.cancel();
            this.cancelationTokenSource = new vscode.CancellationTokenSource();
            this.getParentSchemas(this.currentShema, this.cancelationTokenSource.token).then((resp) => {
                this.schemas = resp.schemas;
                if (!resp.cancelled) {
                    this.reloadWebview();
                    FileSystemHelper.writeFiles(resp.schemas);
                }
            });
            return `<span class="loader"></span>`;
        }


    }

    // Sorts schemas by parent
    orderSchemas(schemas: Schema[]): Schema[] {
        return [];
    }

    buildInheritanceTree(): string {
        if (!this.schemas) {
            return "";
        }
        let html = "";
        for (let i = 0; i < this.schemas.length; i++) {
            html += `<div id = ${this.schemas[i].uId}>${this.schemas[i].name} (${this.schemas[i].package?.name})</div>`;
        }
        return html;
    }

    setItem(schema: WorkSpaceItem): void {
        this.currentShema = schema;
        if (this.schemas) {
            if (this.schemas.findIndex(x => x.uId === schema.uId) === -1) {
                this.schemas = undefined;
                this.reloadWebview();
            }
        } else {
            this.reloadWebview();
        }
    }
}