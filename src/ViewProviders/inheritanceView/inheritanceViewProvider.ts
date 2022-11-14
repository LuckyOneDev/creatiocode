import { CreatioWebViewProvider } from '../creatioWebViewProvider';
import * as vscode from 'vscode';
import { CreatioFS } from '../../fileSystemProvider';
import { Schema, WorkSpaceItem } from '../../api/creatioInterfaces';
import { WorkspaceItemViewProvider } from '../workspaceItemViewProvider';
import { CreatioClient } from '../../api/creatioClient';
import { CreatioStatusBar } from '../../statusBar';

export class InheritanceViewProvider extends WorkspaceItemViewProvider {
    loading?: Promise<void>;
    loadedSchema?: WorkSpaceItem;
    cancelationTokenSource = new vscode.CancellationTokenSource();
    protected getScripts(): string[] {
        return ['./src/ViewProviders/inheritanceView/inheritanceView.js/'];
    }
    schemas?: Schema[];
    protected getStyles(): string {
        return this.getLoaderCSS() + `
        div {
            cursor: pointer;
            width: 100%;
        }
        div:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        div.selected {
            background-color: var(--vscode-list-activeSelectionBackground);
        }
        `;
    }

    protected onDidReceiveMessage(message: any): void {
        let uri = CreatioFS.getInstance().getSchemaUri(message.id);
        vscode.workspace.openTextDocument(uri!).then(document => {
            vscode.window.showTextDocument(document);
        });
    }

    protected async getParentSchemas(workSpaceItem: WorkSpaceItem, token: vscode.CancellationToken): Promise<{ schemas: Array<Schema>, cancelled: boolean }> {
        let items = [];
        let client = CreatioFS.getInstance().client;
        if (client) {
            let first = await client.getSchema(workSpaceItem.uId, workSpaceItem.type);
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
            return this.buildInheritanceTree(this.schemas);
        } else {
            this.cancelationTokenSource.cancel();
            this.cancelationTokenSource = new vscode.CancellationTokenSource();
            this.getParentSchemas(this.currentShema, this.cancelationTokenSource.token).then((resp) => {
                this.schemas = resp.schemas;
                if (!resp.cancelled) {
                    this.reloadWebview();
                    CreatioFS.getInstance().addSchemasToDisk(resp.schemas);
                }
            });
            return `<span class="loader"></span>`;
        }


    }

    buildInheritanceTree(schemas: Schema[]): string {
        let html = "";
        for (let i = 0; i < schemas.length; i++) {
            html += `<div id = ${schemas[i].uId}>${schemas[i].name} (${schemas[i].package?.name})</div>`;
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