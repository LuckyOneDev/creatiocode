/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { CreatioClient, PackageMetaInfo, SchemaMetaInfo } from './creatio-api';
import { CreatioFS } from './fileSystemProvider';
import { NodeDependenciesProvider } from './nodeDepProv';
import { CreatioExplorer } from './viewProvider';

async function getInput(oldInput: any) {
	const url = await vscode.window.showInputBox({
		title: 'Creatio url',
		value: oldInput.url || "safilo-dev2.maticson-lab.ru"
	});

	const login = await vscode.window.showInputBox({
		title: 'Creatio login',
		value: oldInput.login || "Supervisor"
	});

	const password = await vscode.window.showInputBox({
		title: 'Creatio password',
		value: oldInput.password || "Supervisor"
	});

	return {
		url: url,
		login: login,
		password: password
	};
}

function registerFileSystem(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.createCreatioWorkspace', async function () {
		let input: any;
		input = await getInput(context.workspaceState.get('login-data'));
		vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse('creatio:/'), name: input.url });
		context.workspaceState.update('login-data', input);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.reloadCreatioWorkspace', async function () {
		let fs = CreatioFS.getInstance();
		fs.client = new CreatioClient(context.workspaceState.get("creditentials"));
		await fs.client.connect();
		await fs.initFileSystem();
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

	const rootPath =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

	if (rootPath) {
		vscode.window.registerTreeDataProvider(
			'nodeDependencies',
			new NodeDependenciesProvider(rootPath)
		);
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }
