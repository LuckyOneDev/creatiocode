import * as vscode from 'vscode';
import { CreatioFS } from '../fileSystemProvider';
import { WorkSpaceItem } from '../api/creatioInterfaces';
import { CreatioWebViewProvider } from './creatioWebViewProvider';

export abstract class WorkspaceItemViewProvider extends CreatioWebViewProvider {
  currentShema?: WorkSpaceItem;
  constructor(context: vscode.ExtensionContext) {
    super(context);
    vscode.workspace.onDidChangeTextDocument(x => {
      if (x.document.uri.scheme === 'creatio') {
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
    

    // let textEditor = vscode.window.activeTextEditor;
    // if (textEditor && textEditor.document.uri === vscode.Uri.parse("creatio:/")) {
    //   let fs = CreatioFS.getInstance();
    //   let file = fs.getFile(textEditor.document.uri);
    //   if (file?.schemaMetaInfo) {
    //     this.currentShema = file.schemaMetaInfo;
    //   }
    // }
  }

  setItem(schema: WorkSpaceItem): void {
    this.currentShema = schema;
    this.reloadWebview();
  }
}