import * as vscode from 'vscode';
import { CreatioFS, File } from '../../fs/fileSystemProvider';
import { WorkSpaceItem } from '../../api/creatioTypes';
import { CreatioWebViewProvider } from './creatioWebViewProvider';

export abstract class WorkspaceItemViewProvider extends CreatioWebViewProvider {
  currentFile?: File;
  constructor(context: vscode.ExtensionContext) {
    super(context);
    vscode.window.onDidChangeActiveTextEditor(x => {
      if (x?.document.uri.scheme === 'creatio') {
        let file = CreatioFS.getInstance().getMemFile(x.document.uri);
        if (file) {
          this.setItem(file);
        }
      }
    });

    vscode.workspace.onDidOpenTextDocument(x => {
      if (x.uri.scheme === 'creatio') {
        let file = CreatioFS.getInstance().getMemFile(x.uri);
        if (file) {
          this.setItem(file);
        }
      }
    });
  }

  setItem(file: File): void {
    this.currentFile = file;
    this.reloadWebview();
  }
}