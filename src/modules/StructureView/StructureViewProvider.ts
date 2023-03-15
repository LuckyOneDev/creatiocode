import * as vscode from "vscode";
import { CreatioAstNode, CreatioAstStructure } from "./CreatioAst";
import { CreatioStatusBar } from "../../common/CreatioStatusBar";
import { CreatioFileSystemProvider } from "../FileSystem/CreatioFileSystemProvider";
import { CreatioCodeContext } from "../globalContext";

export class SchemaStructureDefinitionProvider implements vscode.DefinitionProvider {
	// Singleton
	private constructor() { }
	private static instance: SchemaStructureDefinitionProvider;
	public static getInstance(): SchemaStructureDefinitionProvider {
		if (!SchemaStructureDefinitionProvider.instance) {
			SchemaStructureDefinitionProvider.instance = new SchemaStructureDefinitionProvider();
		}
		return SchemaStructureDefinitionProvider.instance;
	}

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
	node: CreatioAstNode;
	constructor(node: CreatioAstNode) {
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

	getChildren(element?: SchemaStructureTreeItem | undefined): vscode.ProviderResult<SchemaStructureTreeItem[]> {
		if (!element) {
			let text = vscode.window.activeTextEditor?.document.getText();
			if (text) {
				try {
					let ast = new CreatioAstStructure(text);
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