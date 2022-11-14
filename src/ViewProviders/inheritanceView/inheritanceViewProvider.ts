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

    protected async getParentSchemas(workSpaceItem: WorkSpaceItem, items?: Array<Schema>): Promise<Array<Schema>> {
        if (items) {
            let item = items[items.length - 1];
            if (item.parent && item.parent.uId) {
                let schemaData = await CreatioFS.getInstance().client?.getSchema(item.parent.uId, workSpaceItem.type);
                if (schemaData) {
                    items.push(schemaData);
                    if (schemaData.parent?.uId) {
                        return await this.getParentSchemas(workSpaceItem, items);
                    }
                }
            }
            return items;
        } else {
            items = [];
            let schemaData = await CreatioFS.getInstance().client?.getSchema(workSpaceItem.uId, workSpaceItem.type);
            if (schemaData) {
                items.push(schemaData);
                return this.getParentSchemas(workSpaceItem, items);
            } else {
                return items;
            }
        }
    }

    protected getBody(): string {
        if (!this.currentShema) {
            return "Schema not selected";
        }

        if (this.schemas && this.schemas.findIndex(x => x.uId === this.currentShema?.uId) !== -1) {
            return this.buildInheritanceTree(this.schemas);
        } else 
        {
            this.getParentSchemas(this.currentShema).then((schemas) => {
                this.schemas = schemas;
                this.reloadWebview();
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
        if (this.schemas && this.schemas.findIndex(x => x.uId === schema.uId) !== -1) {

        } else {
            this.reloadWebview();
        }
    }
}