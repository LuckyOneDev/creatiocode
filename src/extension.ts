/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { CreatioClient } from './creatio';
import { CreatioFS } from './fileSystemProvider';

async function openUri(fileName: string) {
	let uri = vscode.Uri.parse('creatiocode:' + fileName);
	let doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
	await vscode.window.showTextDocument(doc, { preview: false });
}

function registerTextProvider(context: vscode.ExtensionContext) {
	const myScheme = 'creatiocode';
	const myProvider = new class implements vscode.TextDocumentContentProvider {
		onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
		onDidChange = this.onDidChangeEmitter.event;

		provideTextDocumentContent(uri: vscode.Uri): string {
			return uri.path;
		}
	};
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider));
}

async function getInput() {
	const url = await vscode.window.showInputBox({
		title: 'Creatio url',
		value: "safilo-dev2.maticson-lab.ru"
	});

	const login = await vscode.window.showInputBox({
		title: 'Creatio login',
		value: "Supervisor"
	});

	const password = await vscode.window.showInputBox({
		title: 'Creatio password',
		value: "Supervisor"
	});

	return {
		url: url,
		login: login,
		password: password
	};
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.createCreatioWorkspace', async function () {
		let input = await getInput();
		vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse('creatio:/'), name: input.url });
		context.workspaceState.update("creditentials", input);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('creatiocode.reloadCreatioWorkspace', async function () {
		let fs = CreatioFS.getInstance();
		if (context.workspaceState.get("creditentials") !== undefined) {
			fs.client = new CreatioClient(context.workspaceState.get("creditentials"));
			let connected = await fs!.client.connect();
			if (connected) {
				vscode.window.showInformationMessage("Loading files...");

				let workspaceItems = await fs.client.getWorkspaceItems();

				workspaceItems.forEach(element => {
					fs.writeFile(vscode.Uri.parse(`creatio:/${element.getFile()}`), Buffer.from(JSON.stringify(element)), { create: true, overwrite: true });
				});
				vscode.window.showInformationMessage("Files loaded...");
			}
		} else {
			vscode.window.showErrorMessage("Creatio workspace not found");
		}
	}));

	context.subscriptions.push(vscode.workspace.registerFileSystemProvider(
		'creatio',
		CreatioFS.getInstance(),
		{ isCaseSensitive: true }
	));
}

// This method is called when your extension is deactivated
export function deactivate() { }
