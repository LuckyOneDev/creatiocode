import * as vscode from "vscode";
import { ShemaStructureNode, ShemaAstStructure } from "./CreatioAst";
import { CreatioCodeContext } from "../../globalContext";

export class SchemaStructureDefinitionProvider implements vscode.DefinitionProvider {
	// referenceIndex: Map<vscode.TextDocument, Map<vscode.Position, vscode.Uri>> = new Map();

	public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Location | undefined> {
		return new Promise((resolve, reject) => {
			let fileName = document.getText(document.getWordRangeAtPosition(position));
			// Temporary fast search
			let files = CreatioCodeContext.fsProvider.getUriByName(fileName);
			if (files.length > 0) {
				// @ts-ignore
				resolve(new vscode.Location(files.find(x => x.path !== document.uri.path) || files[0], new vscode.Position(0, 0)));
			} else {
				resolve(undefined);
			}
			 
			// REALLY LONG F*CKING SEARCH
			// CreatioStatusBar.animate("Trying to find file...");
			// CreatioFS.getInstance().getUriByName(fileName, token).then(files => {
			// 	if (files.length > 0) {
			// 		resolve(new vscode.Location(files[files.length - 1], new vscode.Position(0, 0)));
			// 	} else {
			// 		resolve(undefined);
			// 	}
			// }).catch(err => {
			// 	resolve(undefined);
			// }).finally(() => {
			// 	CreatioStatusBar.update("Loading stopped");
			// });
		});
	}
}

class SchemaStructureTreeItem extends vscode.TreeItem {
	node: ShemaStructureNode;
	constructor(node: ShemaStructureNode) {
		super(node.name, node.children && node?.children?.length > 0
			? vscode.TreeItemCollapsibleState.Collapsed
			: vscode.TreeItemCollapsibleState.None);
		this.node = node;
		this.tooltip = node.tooltip || node.name;
		if (node.location) {
			this.command = {
				command: "creatiocode.schemaTreeViewer.reveal",
				title: "Reveal",
				arguments: [node.location]
			};
		}
		this.iconPath = this.getIconPath();
	}

	getIconPath(): string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri; } | vscode.ThemeIcon {
		return "";
	}

	getChildren(): vscode.ProviderResult<SchemaStructureTreeItem[]> {
		if (this.node.children && this.node.children?.length > 0) {
			return this.node.children.map(child => new SchemaStructureTreeItem(child));
		}
		return [];
	}
}

export class StructureViewProvider implements vscode.TreeDataProvider<SchemaStructureTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<SchemaStructureTreeItem | undefined | null | void> = new vscode.EventEmitter<SchemaStructureTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<SchemaStructureTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor() {
		vscode.window.onDidChangeActiveTextEditor((x) => {
			this._onDidChangeTreeData.fire();
		});
	}

	getTreeItem(element: SchemaStructureTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	async getChildren(element?: SchemaStructureTreeItem | undefined): Promise<SchemaStructureTreeItem[] | null | undefined> {
		if (!element) {
			const currentDocument = vscode.window.activeTextEditor?.document;
			if (currentDocument) {
				try {
					
					let ast = await CreatioCodeContext.creatioFileRelationProvider.loadAst(currentDocument.uri);
					let treeItems = ast.getAsNodes().map(node => new SchemaStructureTreeItem(node));
					return treeItems;
				} catch (e) {
					console.error(e);
				}
			}
		} else {
			return element.getChildren();
		}	
	}
}