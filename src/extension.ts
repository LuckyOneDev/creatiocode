import * as vscode from 'vscode';
import { CreatioClient } from './api/creatioClient';
import { CreatioFS } from './fs/fileSystemProvider';
import { CreatioStatusBar } from './common/statusBar';
import { SchemaMetaDataViewProvider } from './ViewProviders/schemaMetaDataViewProvider';
import { InheritanceViewProvider } from './ViewProviders/inheritanceViewProvider';

async function getInput(oldInput: any) {
	const url = await vscode.window.showInputBox({
		title: 'Creatio url',
		value: oldInput?.url || "baseurl"
	});
	if (!url) {
		return undefined;
	}

	const login = await vscode.window.showInputBox({
		title: 'Creatio login',
		value: oldInput?.login || "Supervisor"
	});
	if (!login) {
		return undefined;
	}

	const password = await vscode.window.showInputBox({
		title: 'Creatio password',
		value: oldInput?.password || "Supervisor"
	});
	if (!password) {
		return undefined;
	}

	return {
		url: url,
		login: login,
		password: password
	};
}

async function reloadWorkSpace(context: vscode.ExtensionContext) {
	let fs = CreatioFS.getInstance();
	let loginData: any = context.workspaceState.get("login-data");

	// if there is a workplace already open for current login data
	if (loginData && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.scheme === "creatio") {
		fs.client = new CreatioClient(loginData);
		let connected = await fs.client.login();
		if (connected) {
			await fs.initFileSystem();
		}
	} else {
		vscode.window.showErrorMessage("No workspace found");
	}
}

async function createWorkspace(context: vscode.ExtensionContext) {
	let input = await getInput(context.workspaceState.get('login-data'));
	if (input) {
		vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length,
			{
				uri: vscode.Uri.parse('creatio:/'),
				name: input.url
			}
		);
		context.workspaceState.update('login-data', input);
	}
}

function registerFileSystem(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.createCreatioWorkspace', async () => {
		createWorkspace(context);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.reloadCreatioWorkspace', async () => {
		reloadWorkSpace(context);
	}));

	context.subscriptions.push(vscode.workspace.registerFileSystemProvider(
		'creatio',
		CreatioFS.getInstance(),
		{ isCaseSensitive: true }
	));
}

function registerContextMenus(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.cacheFolder', function (folder: vscode.Uri) {
		let fs = CreatioFS.getInstance();
		fs.cacheFolder(folder);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.revertSchema', async function (file: vscode.Uri) {
		let fs = CreatioFS.getInstance();
		await fs.revertSchema(file);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.clearCache', async function () {
		let fs = CreatioFS.getInstance();
		await fs.clearCache();
	}));
}

export function activate(context: vscode.ExtensionContext) {
	registerFileSystem(context);
	registerContextMenus(context);

	// context.subscriptions.push(vscode.commands.registerCommand('creatiocode.executeSQL', async () => {
	// 	const client = CreatioFS.getInstance().client;
	// 	if (client) {
	// 		let sql = await vscode.window.showInputBox({
	// 			title: 'Creatio sql',
	// 			value: "select * from SysUser"
	// 		});
	// 		if (sql) {
	// 			let result = await client.selectQuery(sql);
	// 			vscode.window.showInformationMessage(result);
	// 		}
	// 	}
	// }));

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("creatioFileInfo", new SchemaMetaDataViewProvider(context))
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("creatioInheritance", new InheritanceViewProvider(context))
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
	
	// context.subscriptions.push(
	// 	vscode.window.registerWebviewViewProvider("creatiocodeSearchView", new SearchViewProvider(context))
	// );

	CreatioStatusBar.show('Creatio not initialized');
}

// This method is called when your extension is deactivated
export function deactivate() { }
