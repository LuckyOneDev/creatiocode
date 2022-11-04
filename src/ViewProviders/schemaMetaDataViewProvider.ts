import * as vscode from 'vscode';
import { CreatioFS } from '../fileSystemProvider';
import { WorkSpaceItem } from '../api/creatioInterfaces';
import { CreatioWebViewProvider } from './creatioWebViewProvider';

export class SchemaMetaDataViewProvider extends CreatioWebViewProvider {
  currentShema?: WorkSpaceItem;
  private static instance: SchemaMetaDataViewProvider;

  protected getStyles(): string {
    return '';
  }

  createTableString(tableData: Array<Array<string>>): string {
    var result = "<table>";
    for(var i=0; i<tableData.length; i++) {
        result += "<tr>";
        for(var j=0; j<tableData[i].length; j++){
            result += "<td>"+tableData[i][j]+"</td>";
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

  protected getBody(): string {
    if (!this.currentShema) {
      return 'Schema not selected';
    }
    return this.generateTable(this.currentShema);
  }

  constructor() {
    super();
    vscode.workspace.onDidOpenTextDocument(x => {
      if (x.uri.scheme === 'creatio') {
        let file = CreatioFS.getInstance().getFile(x.uri);
        if (file) {
          this.setItem(file.schemaMetaInfo);
        }
      }
    });

    let textEditor = vscode.window.activeTextEditor;
    if (textEditor && textEditor.document.uri === vscode.Uri.parse("creatio:/")) {
      let fs = CreatioFS.getInstance();
      let file = fs.getFile(textEditor.document.uri);
      if (file?.schemaMetaInfo) {
        this.currentShema = file.schemaMetaInfo;
      }
    }
  }

  public static getInstance(): SchemaMetaDataViewProvider {
    if (!SchemaMetaDataViewProvider.instance) {
      SchemaMetaDataViewProvider.instance = new SchemaMetaDataViewProvider();
    }
    return SchemaMetaDataViewProvider.instance;
  }

  setItem(schema: WorkSpaceItem): void {
    this.currentShema = schema;
    this.reloadWebview();
  }
}