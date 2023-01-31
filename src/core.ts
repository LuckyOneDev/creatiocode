import * as vscode from 'vscode';
import { ConfigurationHelper } from "./common/ConfigurationHelper";
import { ConnectionInfo } from "./creatio-api/ConnectionInfo";
import { CreatioClient } from "./creatio-api/CreatioClient";
import { CreatioLoginPanel } from "./modules/ConnectionPanel/CreatioLoginPanel";
import { CreatioExplorer } from "./modules/FileSystem/CreatioExplorer";
import { CreatioFileSystemProvider } from "./modules/FileSystem/CreatioFileSystemProvider";
import { IntellisenseHelper } from "./modules/Intellisense/IntellisenseHelper";

export async function getInput(oldInput: any): Promise<ConnectionInfo | undefined> {
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

	return new ConnectionInfo(url, login, password);
}

export async function tryCreateConnection(): Promise<CreatioClient | null> {
	let loginData: ConnectionInfo | undefined = ConfigurationHelper.getLoginData();
	if (loginData) {
		loginData = new ConnectionInfo(loginData.url, loginData.login, loginData.password);
		let client = new CreatioClient(loginData);
		return await client.login() ? client : null;
	}
	return null;
}



export async function createWorkspace(context: vscode.ExtensionContext) {
	let panelProvider = new CreatioLoginPanel(context);
	panelProvider.createPanel();
}

export async function reloadWorkSpace() {
	let connectionInfo = ConfigurationHelper.getLoginData();
	if (!connectionInfo) {
		return false;
	}
	
	let fs = CreatioFileSystemProvider.getInstance();
	let client = await tryCreateConnection();
	if (client) {
		fs.client = client;
		await fs.reload();
		CreatioExplorer.getInstance().refresh();
		if (ConfigurationHelper.useAdvancedIntellisense()) 
		{
			await IntellisenseHelper.init();
		}
		vscode.commands.executeCommand('setContext', 'creatio.workspaceLoaded', true);
	}

	return client !== null;
}