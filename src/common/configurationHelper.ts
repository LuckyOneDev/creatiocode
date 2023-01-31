import { RetryOptions } from 'ts-retry';
import * as vscode from 'vscode';
import { ConnectionInfo } from '../creatio-api/ConnectionInfo';
import { SchemaType, WorkSpaceItem } from '../creatio-api/CreatioTypeDefinitions';

export class ConfigurationHelper {
    static context: vscode.ExtensionContext;
    static config: vscode.WorkspaceConfiguration;

    static init(context: vscode.ExtensionContext) {
        ConfigurationHelper.context = context;
        ConfigurationHelper.config = vscode.workspace.getConfiguration("creatiocode");
    }

    static getSchemaTypeByExtension(path: string): SchemaType {
        let extension = path.split('.').pop();
        switch (extension) {
            case this.config.get("fileTypes.ClientUnit.Extension"):
                return SchemaType.clientUnit;
            case this.config.get("fileTypes.SourceCode.Extension"):
                return SchemaType.sourceCode;
            case this.config.get("fileTypes.ProcessUserTask.Extension"):
                return SchemaType.processUserTask;
            case this.config.get("fileTypes.SqlScript.Extension"):
                return SchemaType.sqlScript;
            case this.config.get("fileTypes.Entity.Extension"):
                return SchemaType.entity;
            case this.config.get("fileTypes.Data.Extension"):
                return SchemaType.data;
            case this.config.get("fileTypes.Process.Extension"):
                return SchemaType.process;
            case this.config.get("fileTypes.Case.Extension"):
                return SchemaType.case;
            default:
                return SchemaType.unknown;
        }
    }

    static getExtension(type: SchemaType): string | undefined {
        switch (type) {
            case SchemaType.clientUnit:
                return ConfigurationHelper.config.get("fileTypes.ClientUnit.Extension");
            case SchemaType.case:
                return ConfigurationHelper.config.get("fileTypes.Case.Extension");
            case SchemaType.data:
                return ConfigurationHelper.config.get("fileTypes.Data.Extension");
            case SchemaType.dll:
                return ConfigurationHelper.config.get("fileTypes.Dll.Extension");
            case SchemaType.entity:
                return ConfigurationHelper.config.get("fileTypes.Entity.Extension");
            case SchemaType.sourceCode:
                return ConfigurationHelper.config.get("fileTypes.SourceCode.Extension");
            case SchemaType.sqlScript:
                return ConfigurationHelper.config.get("fileTypes.SqlScript.Extension");
            case SchemaType.process:
                return ConfigurationHelper.config.get("fileTypes.Process.Extension");
            case SchemaType.processUserTask:
                return ConfigurationHelper.config.get("fileTypes.ProcessUserTask.Extension");
            default:
                return undefined;
        }
    }

    static isFileTypeEnabled(type: SchemaType) {
        switch (type) {
            case SchemaType.clientUnit:
                return ConfigurationHelper.config.get("fileTypes.ClientUnit.Enabled");
            case SchemaType.case:
                return ConfigurationHelper.config.get("fileTypes.Case.Enabled");
            case SchemaType.data:
                return ConfigurationHelper.config.get("fileTypes.Data.Enabled");
            case SchemaType.dll:
                return ConfigurationHelper.config.get("fileTypes.Dll.Enabled");
            case SchemaType.entity:
                return ConfigurationHelper.config.get("fileTypes.Entity.Enabled");
            case SchemaType.sourceCode:
                return ConfigurationHelper.config.get("fileTypes.SourceCode.Enabled");
            case SchemaType.sqlScript:
                return ConfigurationHelper.config.get("fileTypes.SqlScript.Enabled");
            case SchemaType.process:
                return ConfigurationHelper.config.get("fileTypes.Process.Enabled");
            case SchemaType.processUserTask:
                return ConfigurationHelper.config.get("fileTypes.ProcessUserTask.Enabled");
            default:
                return false;
        }
    }

    static getLoginData(): ConnectionInfo | undefined {
        let loginData: ConnectionInfo | undefined = ConfigurationHelper.context.globalState.get("loginData");
        if (loginData) {
           return new ConnectionInfo(loginData.url, loginData.login, loginData.password);
        }
        return undefined;
    }

    static setLoginData(loginData: ConnectionInfo) {
        ConfigurationHelper.context.globalState.update("loginData", loginData);
    }

    static isCarefulMode(): boolean {
        return this.config.get("carefulMode") ? true : false;
    }

    static getRetryPolicy(): RetryOptions {
        return {
            maxTry: this.config.get("retryPolicy.attempts") || 3,
            delay: this.config.get("retryPolicy.delay") || 1000
        };
    }

    static useAdvancedIntellisense(): boolean {
        return this.config.get("advancedIntellisense") ? true : false;
    }
}