import * as vscode from 'vscode';
import { CreatioFS } from '../../fs/fileSystemProvider';
import { WorkSpaceItem } from '../../api/creatioTypes';
import { CreatioWebViewProvider } from './creatioWebViewProvider';

export abstract class WorkspaceItemViewProvider extends CreatioWebViewProvider {
  currentShema?: WorkSpaceItem;
  constructor(context: vscode.ExtensionContext) {
    super(context);
    vscode.window.onDidChangeActiveTextEditor(x => {
      if (x?.document.uri.scheme === 'creatio') {
        let file = CreatioFS.getInstance().getFile(x.document.uri);
        if (file) {
          this.setItem(file.schemaMetaInfo);
        }
      }
    });

    vscode.workspace.onDidOpenTextDocument(x => {
      if (x.uri.scheme === 'creatio') {
        let file = CreatioFS.getInstance().getFile(x.uri);
        if (file) {
          this.setItem(file.schemaMetaInfo);
        }
      }
    });
  }

  setItem(schema: WorkSpaceItem): void {
    this.currentShema = schema;
    this.reloadWebview();
  }
}