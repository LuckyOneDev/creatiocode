import * as vscode from 'vscode';
import { GenericWebViewProvider } from './GenericWebViewProvider';
import { CreatioCodeContext } from '../../globalContext';
import { Entry, File, Directory } from '../../modules/FileSystem/ExplorerItem';

export abstract class WorkspaceItemViewProvider extends GenericWebViewProvider {
  currentFile?: File;
  constructor() {
    super();
    vscode.window.onDidChangeActiveTextEditor(x => {
      if (x?.document.uri.scheme === 'creatio') {
        let file = CreatioCodeContext.fsProvider.getMemFile(x.document.uri);
        if (file) {
          this.setItem(file);
        }
      }
    });

    vscode.workspace.onDidOpenTextDocument(x => {
      if (x.uri.scheme === 'creatio') {
        let file = CreatioCodeContext.fsProvider.getMemFile(x.uri);
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