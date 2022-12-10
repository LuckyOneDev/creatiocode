import * as vscode from 'vscode';
import { CreatioFS, File } from './fs/fileSystemProvider';
import { Schema, WorkSpaceItem } from '../api/creatioTypes';
import { WorkspaceItemViewProvider } from './common/workspaceItemViewProvider';
import { FileSystemHelper } from './fs/fsHelper';

export class InheritanceViewProvider extends WorkspaceItemViewProvider {
    scripts = ['inheritanceView.js'];
    styles = ['loader.css', 'inheritanceView.css'];

    loading?: Promise<void>;
    loadedSchema?: WorkSpaceItem;
    cancelationTokenSource = new vscode.CancellationTokenSource();

    files?: File[];

    protected onDidReceiveMessage = (message: any) => {
        switch (message.command) {
            case 'openSchema':
                let uri = CreatioFS.getInstance().getSchemaUri(message.id);
                vscode.workspace.openTextDocument(uri!).then(document => {
                    vscode.window.showTextDocument(document);
                });
                break;
            case 'getCurrentSchema':
                this.postMessage(this.currentFile?.workSpaceItem.uId);
                break;
        }

    };

    protected getBody(): string {
        // Check if currentFile is defined
        if (!this.currentFile) {
            return "Schema not selected";
        }

        // If files exists and currentFile is in it, build inheritance tree
        if (this.files && this.files.findIndex(x => x.workSpaceItem.uId === this.currentFile?.workSpaceItem.uId) !== -1) {
            return this.buildInheritanceTree();
        } else {
            // Cancel current operation and create new cancellation token
            this.cancelationTokenSource.cancel();
            this.cancelationTokenSource = new vscode.CancellationTokenSource();

            // Get parent files and write them to filesystem
            CreatioFS.getInstance().getParentFiles(this.currentFile, this.cancelationTokenSource.token).then((resp) => {
                this.files = resp.files;
                if (!resp.cancelled) {
                    this.reloadWebview();
                    CreatioFS.getInstance().fsHelper.writeFiles(resp.files);
                }
            });
            return `<span class="loader"></span>`;
        }
    }

    buildInheritanceTree(): string {
        if (!this.files) {
            return "";
        }
        let html = "";
        for (let i = 0; i < this.files.length; i++) {
            html += `<div id = ${this.files[i].workSpaceItem.uId}>${this.files[i].name} (${this.files[i].workSpaceItem.packageName})</div>`;
        }
        return html;
    }

    setItem(file: File): void {
        this.currentFile = file;
        if (this.files) {
            if (this.files.findIndex(x => x.workSpaceItem.uId === file.workSpaceItem.uId) === -1) {
                this.files = undefined;
                this.reloadWebview();
            }
        } else {
            this.reloadWebview();
        }
    }
}