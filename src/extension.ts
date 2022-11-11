import * as vscode from 'vscode';
import { CreatioClient } from './api/creatioClient';
import { CreatioFS } from './fileSystemProvider';
import { CreatioStatusBar } from './statusBar';
import { SchemaMetaDataViewProvider } from './ViewProviders/schemaMetaDataViewProvider';
import { InheritanceViewProvider } from './ViewProviders/inheritanceView/inheritanceViewProvider';
import { SearchViewProvider } from './ViewProviders/searchView/searchViewProvider';

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
	if (context.workspaceState.get("login-data")) {
		fs.client = new CreatioClient(context.workspaceState.get("login-data"));
		try {
			await fs.client.connect();
			await fs.initFileSystem();
		} catch (e) {
			vscode.window.showErrorMessage("Something went wrong. Please check your credentials and try again.");
			return false;
		}
		return true;
	} else {
		vscode.window.showErrorMessage("No workspace found");
		return false;
	}
}

async function createWorkspace(context: vscode.ExtensionContext) {
	let input = await getInput(context.workspaceState.get('login-data'));
	if (input) {
		vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length, { uri: vscode.Uri.parse('creatio:/'), name: input.url });
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

	// context.subscriptions.push(
	// 	vscode.window.registerWebviewViewProvider("creatiocodeSearchView", new SearchViewProvider(context))
	// );

	CreatioStatusBar.show('Creatio not initialized');
}

// This method is called when your extension is deactivated
export function deactivate() { }
