import * as vscode from 'vscode';
import { ConfigurationHelper } from './common/ConfigurationHelper';
import { CreatioCodeUtils } from './common/CreatioCodeUtils';
import { ConnectionInfo } from './creatio-api/ConnectionInfo';
import { CreatioClient } from './creatio-api/CreatioClient';
import { CommentDefinitionProvider } from './modules/CommentIntellisense/CommentDefinitionProvider';
import { CreatioLoginPanel } from './modules/ConnectionPanel/CreatioLoginPanel';
import { CreatioExplorer } from './modules/FileSystem/CreatioExplorer';
import { CreatioFileSystemProvider } from './modules/FileSystem/CreatioFileSystemProvider';
import { CreatioExplorerDecorationProvider } from './modules/FileSystem/ExplorerDecorationProvider';
import { FileSystemHelper } from './modules/FileSystem/FileSystemHelper';
import { IntellisenseVirtualFileSystemProvider } from './modules/Intellisense/IntellisenseVirtualFileSystemProvider';
import { ObjectCompletionItemProvider } from './modules/Intellisense/ObjectCompletionItemProvider';
import { ObjectDefinitionProvider } from './modules/Intellisense/ObjectDefinitionProvider';
import { ObjectHoverProvider } from './modules/Intellisense/ObjectHoverProvider';
import { SchemaMetaDataViewProvider } from "./modules/Legacy/SchemaMetaDataViewProvider";
import { CreatioFileRelationProvider } from './modules/RelatedFiles/CreatioFileRealtionProvider';
import { InheritanceViewProvider } from './modules/RelatedFiles/InheritanceViewProvider';
import { SchemaStructureDefinitionProvider } from './modules/StructureView/StructureViewProvider';

export enum ReloadStatus {
    error,
    success,
    progress
};

/**
 * Used to access and register global extension objects.
 */
export class CreatioCodeContext {
    static init(context: vscode.ExtensionContext) {
	    this.extensionContext = context;
        this.fsProvider = new CreatioFileSystemProvider();
        this.client = new CreatioClient();
        this.fsHelper = new FileSystemHelper();
        this.explorer = new CreatioExplorer();
        this.decorationProvider = new CreatioExplorerDecorationProvider();

        this.definitionProvider = new ObjectDefinitionProvider();
        this.hoverProvider = new ObjectHoverProvider();
        this.commentDefinitionProvider = new CommentDefinitionProvider();
        this.intellisenseFsProv = new IntellisenseVirtualFileSystemProvider();
        this.schemaStructureDefinitionProvider = new SchemaStructureDefinitionProvider();
        this.objectCompletionItemProvider = new ObjectCompletionItemProvider();

        this.metadataProvider = new SchemaMetaDataViewProvider();
        this.inheritanceProvider = new InheritanceViewProvider();

        this.creatioFileRelationProvider = new CreatioFileRelationProvider();
    }

    static fileSystemName: string = "creatio";
    static extensionContext: vscode.ExtensionContext;
    
    static fsProvider: CreatioFileSystemProvider;
    static client: CreatioClient;
    static fsHelper: FileSystemHelper;
    static explorer: CreatioExplorer;
    static decorationProvider: CreatioExplorerDecorationProvider;

    static definitionProvider: ObjectDefinitionProvider;
    static hoverProvider: ObjectHoverProvider;
    static commentDefinitionProvider: CommentDefinitionProvider;
	static intellisenseFsProv: IntellisenseVirtualFileSystemProvider;
	static schemaStructureDefinitionProvider : SchemaStructureDefinitionProvider;
	static objectCompletionItemProvider: ObjectCompletionItemProvider;

    static metadataProvider: SchemaMetaDataViewProvider;
    static inheritanceProvider: InheritanceViewProvider;

    static creatioFileRelationProvider: CreatioFileRelationProvider;

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