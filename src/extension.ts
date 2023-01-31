import * as vscode from 'vscode';
import { CreatioClient } from './creatio-api/CreatioClient';
import { CreatioFileSystemProvider } from './modules/FileSystem/CreatioFileSystemProvider';
import { CreatioStatusBar } from './common/CreatioStatusBar';
import { SchemaMetaDataViewProvider } from './modules/Legacy/SchemaMetaDataViewProvider';
import { InheritanceViewProvider } from './modules/RelatedFiles/InheritanceViewProvider';
import { SchemaStructureDefinitionProvider, StructureViewProvider } from './modules/StructureView/StructureViewProvider';
import { CreatioLoginPanel } from './modules/ConnectionPanel/CreatioLoginPanel';
import { ConfigurationHelper } from './common/ConfigurationHelper';
import { HomeViewProvider } from './modules/ConnectionPanel/HomeViewProvider';
import { CreatioExplorer, CreatioExplorerDecorationProvider, CreatioExplorerItem } from './modules/FileSystem/CreatioExplorer';
import { FileSystemHelper } from './modules/FileSystem/FileSystemHelper';
import { CreatioCompletionItemProvider } from './modules/Intellisense/CreatioCompletionItemProvider';
import { ConnectionInfo } from './creatio-api/ConnectionInfo';
import { CreatioDefinitionProvider } from './modules/Intellisense/CreatioDefinitionProvider';
import { IntellisenseHelper } from './modules/Intellisense/IntellisenseHelper';
import { IntellisenseVirtualFileSystemProvider } from './modules/Intellisense/IntellisenseVirtualFileSystemProvider';
import { CreatioHoverProvider } from './modules/Intellisense/CreatioHoverProvider';
import { createWorkspace, reloadWorkSpace } from './core';

function registerFileSystem(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.createCreatioWorkspace', async () => {
		createWorkspace(context);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.reloadCreatioWorkspace', async () => {
		reloadWorkSpace();
	}));

	// context.subscriptions.push(vscode.workspace.registerFileSystemProvider(
	// 	'creatio',
	// 	CreatioFS.getInstance(),
	// 	{ isCaseSensitive: true }
	// ));
}

function registerContextMenus(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.cacheFolder', function (folder: CreatioExplorerItem) {
		let fs = CreatioFileSystemProvider.getInstance();
		fs.cacheFolder(folder.resourceUri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.revertSchema', async function (file: CreatioExplorerItem) {
		let fs = CreatioFileSystemProvider.getInstance();
		await fs.restoreSchema(file.resourceUri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.generateChanges', async (folder: CreatioExplorerItem) => {
		let fs = CreatioFileSystemProvider.getInstance();
		await fs.generateChanges(folder.resourceUri, context);
	}));
	

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.clearCache', async function () {
		let fs = CreatioFileSystemProvider.getInstance();
		await fs.clearCache();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.lockSchema', async (file: CreatioExplorerItem) => {
		const fs = CreatioFileSystemProvider.getInstance();
		fs.lockSchema(file.resourceUri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.unlockSchema', async (file: CreatioExplorerItem) => {
		const fs = CreatioFileSystemProvider.getInstance();
		fs.unlockSchema(file.resourceUri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.reloadSchema', async (file: CreatioExplorerItem) => {
		const fs = CreatioFileSystemProvider.getInstance();
		await fs.reloadFile(file.resourceUri);
	}));
}

export function activate(context: vscode.ExtensionContext) {
	ConfigurationHelper.init(context);
	registerFileSystem(context);
	registerContextMenus(context);

	context.subscriptions.push(vscode.workspace.registerFileSystemProvider(
		'creatio',
		CreatioFileSystemProvider.getInstance(),
		{ isCaseSensitive: true }
	));


	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("creatioFileInfo", new SchemaMetaDataViewProvider(context))
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("creatioInheritance", new InheritanceViewProvider(context))
	);
	
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider("creatiocode.Explorer", CreatioExplorer.getInstance())
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
			const fs = CreatioFileSystemProvider.getInstance();
			await fs.build();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("creatiocode.rebuild", async () => {
			const fs = CreatioFileSystemProvider.getInstance();
			await fs.rebuild();
		})
	);

	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider("creatio-completion", IntellisenseVirtualFileSystemProvider.getInstance())
	);

	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider('javascript', SchemaStructureDefinitionProvider.getInstance())
	);

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider('javascript', CreatioCompletionItemProvider.getInstance(), '.')
	);

	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider('javascript', CreatioDefinitionProvider.getInstance())
	);

	context.subscriptions.push(
		vscode.languages.registerHoverProvider('javascript', CreatioHoverProvider.getInstance())
	);

	CreatioStatusBar.show('Creatio not initialized');
}

// This method is called when your extension is deactivated
export function deactivate() { }