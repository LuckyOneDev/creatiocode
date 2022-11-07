import * as vscode from 'vscode';
import { CreatioFS } from '../fileSystemProvider';
import { WorkSpaceItem } from '../api/creatioInterfaces';
import { CreatioWebViewProvider } from './creatioWebViewProvider';
import { WorkspaceItemViewProvider } from './workspaceItemViewProvider';

export class SchemaMetaDataViewProvider extends WorkspaceItemViewProvider {
  protected getScripts(): string[] {
    return [];
  }
  protected onDidReceiveMessage(message: any): void {
    return;
  }
  
  protected getStyles(): string {
    return `
    table {
      width: 100%;
    }
    tr:nth-child(odd) {
      background-color: var(--vscode-editor-background);
    }    
    `;
  }

  protected getBody(): string {
    if (!this.currentShema) {
      return 'Schema not selected';
    }
    return this.generateTable(this.currentShema);
  }

  createTableString(tableData: Array<Array<string>>): string {
    var result = "<table>";
    for (var i = 0; i < tableData.length; i++) {
      result += "<tr>";
      for (var j = 0; j < tableData[i].length; j++) {
        result += "<td>" + tableData[i][j] + "</td>";
      }
      result += "</tr>";
    }
    result += "</table>";
    return result;
  }

  generateTable(schema: WorkSpaceItem): string {
    let tableData: any = [];
    for (const [key, value] of Object.entries(schema)) {
      tableData.push([key, value]);
    }
    return this.createTableString(tableData);
  }
}