import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SchemaMetaInfo } from './creatio-api';
import { CreatioFS } from './fileSystemProvider';

export class CreatioSchemaViewProvider implements vscode.TreeDataProvider<SchemaMetaInfoEntry> {
  static currentShema?: SchemaMetaInfo;

  private _onDidChangeTreeData: vscode.EventEmitter<SchemaMetaInfoEntry | undefined | null | void> = new vscode.EventEmitter<SchemaMetaInfoEntry | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SchemaMetaInfoEntry | undefined | null | void> = this._onDidChangeTreeData.event;
  private static instance: CreatioSchemaViewProvider;

  private constructor() { }

  public static getInstance(): CreatioSchemaViewProvider {
    if (!CreatioSchemaViewProvider.instance) {
      CreatioSchemaViewProvider.instance = new CreatioSchemaViewProvider();
    }
    
    vscode.workspace.onDidOpenTextDocument(x => {
      if (x.uri.scheme === 'creatio') {
        let file = CreatioFS.getInstance().getFile(x.uri);
        if (file) {
          CreatioSchemaViewProvider.getInstance().setItem(file.schemaMetaInfo);
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

    return CreatioSchemaViewProvider.instance;
  }

  setItem(schema: SchemaMetaInfo): void {
    CreatioSchemaViewProvider.currentShema = schema;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SchemaMetaInfoEntry): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }
  getChildren(element?: SchemaMetaInfoEntry | undefined): vscode.ProviderResult<SchemaMetaInfoEntry[]> {
    if (CreatioSchemaViewProvider.currentShema && !element) {
      return this.retrieveFileMetaInfo(CreatioSchemaViewProvider.currentShema);
    } else {
      return [];
    }
  }

  retrieveFileMetaInfo(schema: SchemaMetaInfo): vscode.ProviderResult<SchemaMetaInfoEntry[]> {
    let result: SchemaMetaInfoEntry[] = [];
    for (let [key, value] of Object.entries(schema)) {
      let entry = new SchemaMetaInfoEntry(key, value);
      result.push(entry);
    }
    return result;
  }


}
class SchemaMetaInfoEntry extends vscode.TreeItem {
  constructor(propertyName: string, value: string) {
    super(propertyName + ":\t" + value, vscode.TreeItemCollapsibleState.None);
  }

  static metaInf: SchemaMetaInfo;
}
