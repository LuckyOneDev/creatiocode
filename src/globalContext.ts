import * as vscode from 'vscode';
import { ConfigurationHelper } from './common/ConfigurationHelper';
import { CreatioCodeUtils } from './common/CreatioCodeUtils';
import { ConnectionInfo } from './creatio-api/ConnectionInfo';
import { CreatioClient } from './creatio-api/CreatioClient';
import { CreatioLoginPanel } from './modules/ConnectionPanel/CreatioLoginPanel';
import { CreatioExplorer } from './modules/FileSystem/CreatioExplorer';
import { CreatioFileSystemProvider } from './modules/FileSystem/CreatioFileSystemProvider';
import { FileSystemHelper } from './modules/FileSystem/FileSystemHelper';
import { IntellisenseHelper } from './modules/Intellisense/IntellisenseHelper';
import { SchemaMetaDataViewProvider } from "./modules/Legacy/SchemaMetaDataViewProvider";
import { InheritanceViewProvider } from './modules/RelatedFiles/InheritanceViewProvider';

export enum ReloadStatus {
    error,
    success,
    progress
};

/**
 * Used to access and register global extension objects.
 */
export class CreatioCodeContext {
    static extensionContext: vscode.ExtensionContext;
    static metadataProvider = new SchemaMetaDataViewProvider();
    static fsProvider = new CreatioFileSystemProvider();
    static fsHelper = new FileSystemHelper();
    static inheritanceProvider = new InheritanceViewProvider();
    static explorer = new CreatioExplorer();
    static client = new CreatioClient();

    static async getInput(oldInput: any): Promise<ConnectionInfo | undefined> {
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
    
    static async tryCreateConnection(): Promise<CreatioClient | null> {
        let connectionInfo: ConnectionInfo | undefined = ConfigurationHelper.getLoginData();
        if (connectionInfo) {
            // Deserializing
            connectionInfo = new ConnectionInfo(connectionInfo.url, connectionInfo.login, connectionInfo.password);
            return await CreatioCodeContext.client.login(connectionInfo) ? CreatioCodeContext.client : null;
        }
        return null;
    }
    
    static async createWorkspace(context: vscode.ExtensionContext) {
        let panelProvider = new CreatioLoginPanel(context);
        panelProvider.createPanel();
    }
    
    static async reloadWorkSpace(): Promise<ReloadStatus> {
        vscode.commands.executeCommand('setContext', 'creatio.workspaceLoaded', false);
        let connectionInfo = ConfigurationHelper.getLoginData();
        if (!connectionInfo) {
            return ReloadStatus.error;
        }
        
        CreatioCodeContext.fsHelper.root = connectionInfo.getHostName();

        var client = await this.tryCreateConnection();
        if (client) {
            let reloaded = await CreatioCodeContext.fsProvider.reload();
            if (reloaded) {
                CreatioCodeContext.explorer.refresh();
                vscode.commands.executeCommand('setContext', 'creatio.workspaceLoaded', true);
            } else {
                return ReloadStatus.progress;
            }
        } else {
            return ReloadStatus.error;
        }

        let targetUri = vscode.Uri.file(CreatioCodeContext.fsHelper.getDataFolder());
        let currentUri = vscode.workspace.workspaceFolders?.[0].uri;
    
        if (currentUri?.fsPath !== targetUri.fsPath) {
            CreatioCodeUtils.createYesNoDialouge(
                "Because of VsCode's limitations, you need to reload the workspace to use file search and then login again. Do you want to reload the workspace now?", async () => {
                await vscode.commands.executeCommand("vscode.openFolder", targetUri , false);
            });
        }

        // if (ConfigurationHelper.useAdvancedIntellisense()) {
        //     IntellisenseHelper.init();
        // }

        return ReloadStatus.success;
    }
}