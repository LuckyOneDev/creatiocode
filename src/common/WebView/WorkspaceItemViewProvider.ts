import * as vscode from 'vscode';
import { CreatioFileSystemProvider, File } from '../../modules/FileSystem/CreatioFileSystemProvider';
import { WorkSpaceItem } from '../../creatio-api/CreatioTypeDefinitions';
import { GenericWebViewProvider } from './GenericWebViewProvider';

export abstract class WorkspaceItemViewProvider extends GenericWebViewProvider {
  currentFile?: File;
  constructor(context: vscode.ExtensionContext) {
    super(context);
    vscode.window.onDidChangeActiveTextEditor(x => {
      if (x?.document.uri.scheme === 'creatio') {
        let file = CreatioFileSystemProvider.getInstance().getMemFile(x.document.uri);
        if (file) {
          this.setItem(file);
        }
      }
    });

    vscode.workspace.onDidOpenTextDocument(x => {
      if (x.uri.scheme === 'creatio') {
        let file = CreatioFileSystemProvider.getInstance().getMemFile(x.uri);
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