import * as vscode from 'vscode';
import { CreatioFileSystemProvider } from './modules/FileSystem/CreatioFileSystemProvider';
import { CreatioStatusBar } from './common/CreatioStatusBar';
import { SchemaMetaDataViewProvider } from './modules/Legacy/SchemaMetaDataViewProvider';
import { InheritanceViewProvider } from './modules/RelatedFiles/InheritanceViewProvider';
import { SchemaStructureDefinitionProvider, StructureViewProvider } from './modules/StructureView/StructureViewProvider';
import { ConfigurationHelper } from './common/ConfigurationHelper';
import { CreatioExplorer, CreatioExplorerDecorationProvider, CreatioExplorerItem } from './modules/FileSystem/CreatioExplorer';
import { ObjectCompletionItemProvider } from './modules/Intellisense/ObjectCompletionItemProvider';
import { ObjectDefinitionProvider } from './modules/Intellisense/ObjectDefinitionProvider';
import { IntellisenseVirtualFileSystemProvider } from './modules/Intellisense/IntellisenseVirtualFileSystemProvider';
import { ObjectHoverProvider } from './modules/Intellisense/ObjectHoverProvider';
import { CommentDefinitionProvider } from './modules/CommentIntellisense/CommentDefinitionProvider';
import { CreatioCodeContext } from './globalContext';

function registerFileSystem(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.workspace.registerFileSystemProvider(
		'creatio',
		CreatioCodeContext.fsProvider,
		{ isCaseSensitive: true }
	));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.createCreatioWorkspace', async () => {
		CreatioCodeContext.createWorkspace(context);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.reloadCreatioWorkspace', async () => {
		CreatioCodeContext.reloadWorkSpace();
	}));

	// context.subscriptions.push(vscode.workspace.registerFileSystemProvider(
	// 	'creatio',
	// 	CreatioFS.getInstance(),
	// 	{ isCaseSensitive: true }
	// ));
}

function registerContextMenus(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.cacheFolder', function (folder: CreatioExplorerItem) {
		CreatioCodeContext.fsProvider.cacheFolder(folder.resourceUri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.revertSchema', async function (file: CreatioExplorerItem) {
		await CreatioCodeContext.fsProvider.restoreSchema(file.resourceUri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.generateChanges', async (folder: CreatioExplorerItem) => {
		await CreatioCodeContext.fsProvider.generateChanges(folder.resourceUri, context);
	}));


	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.clearCache', async function () {
		await CreatioCodeContext.fsProvider.clearCache();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.lockSchema', async (file: CreatioExplorerItem) => {
		CreatioCodeContext.fsProvider.lockSchema(file.resourceUri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.unlockSchema', async (file: CreatioExplorerItem) => {
		CreatioCodeContext.fsProvider.unlockSchema(file.resourceUri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.reloadSchema', async (file: CreatioExplorerItem) => {
		await CreatioCodeContext.fsProvider.reloadFile(file.resourceUri);
	}));
}

export function activate(context: vscode.ExtensionContext) {
	CreatioCodeContext.extensionContext = context;

	registerFileSystem(context);
	registerContextMenus(context);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("creatioFileInfo", CreatioCodeContext.metadataProvider)
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("creatioInheritance", CreatioCodeContext.inheritanceProvider)
	);

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider("creatiocode.Explorer", CreatioCodeContext.explorer)
	);

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider("creatiocode.view.schemaTreeViewer", new StructureViewProvider())
	);

	context.subscriptions.push(
		vscode.window.registerFileDecorationProvider(CreatioExplorerDecorationProvider.getInstance())
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("creatiocode.schemaTreeViewer.reveal", (location) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor || !location) {
				return;
			}

			var start = new vscode.Position(
				location.start.line - 1,
				location.start.column,
			);
			var end = new vscode.Position(
				location.end.line - 1,
				location.end.column,
			);

			editor.selection = new vscode.Selection(start, end);
			editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("creatiocode.loadFile", async (uri) => {
			await vscode.commands.executeCommand("vscode.open", uri);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("creatiocode.build", async () => {
			await CreatioCodeContext.fsProvider.build();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("creatiocode.rebuild", async () => {
			await CreatioCodeContext.fsProvider.rebuild();
		})
	);

	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider("creatio-completion", IntellisenseVirtualFileSystemProvider.getInstance())
	);

	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider('javascript', SchemaStructureDefinitionProvider.getInstance())
	);

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider('javascript', ObjectCompletionItemProvider.getInstance(), '.')
	);

	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider('javascript', ObjectDefinitionProvider.getInstance())
	);

	context.subscriptions.push(
		vscode.languages.registerHoverProvider('javascript', ObjectHoverProvider.getInstance())
	);


	context.subscriptions.push(
		vscode.languages.registerDocumentLinkProvider('javascript', CommentDefinitionProvider.getInstance())
	);

	CreatioStatusBar.show('Creatio not initialized');
}

// This method is called when your extension is deactivated
export function deactivate() { }