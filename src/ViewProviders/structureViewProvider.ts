import * as vscode from "vscode";
import typescript from "typescript";

class SchemaStructureTreeItem extends vscode.TreeItem {
	children: any;
	location: any;

	constructor(label: string) {
		super(label);
		this.collapsibleState = this.children?.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
		this.command = {
			command: "creatiocode.schemaTreeViewer.reveal",
			title: "Reveal",
			arguments: [this.location]
		};
		this.iconPath = "resources/icons/creatio.svg";
		this.contextValue = "schema";
		this.tooltip = "TEST";
	}
}

export class StructureViewProvider implements vscode.TreeDataProvider<SchemaStructureTreeItem>{
	getTreeItem(element: SchemaStructureTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: SchemaStructureTreeItem | undefined): vscode.ProviderResult<SchemaStructureTreeItem[]> {
		if (!element) {
			// Build ast tree with typescript from current file and form children tree items
			let items: SchemaStructureTreeItem[] = [];
			const source = typescript.createSourceFile("test", "current file placeholder", typescript.ScriptTarget.ES2015);
			source.forEachChild((node) => {
				if (typescript.isPropertyDeclaration(node)) {
					const item = new SchemaStructureTreeItem(node.name.toString());
					item.children = [];
					items.push(item);
				}
			});
			return items;
		}
		return element.children;
	}
}