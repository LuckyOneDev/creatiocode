import * as vscode from 'vscode';
import { ConnectionInfo } from '../api/creatioClient';
import { SchemaType, WorkSpaceItem } from '../api/creatioTypes';

export class ConfigHelper {
    public static config = vscode.workspace.getConfiguration('creatiocode');

    public static getSchemaTypeByExtension(path: string): SchemaType {
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

    public static getExtension(type: SchemaType): string | undefined {
        switch (type) {
            case SchemaType.clientUnit:
                return ConfigHelper.config.get("fileTypes.ClientUnit.Enabled");
            case SchemaType.case:
                return ConfigHelper.config.get("fileTypes.Case.Enabled");
            case SchemaType.data:
                return ConfigHelper.config.get("fileTypes.Data.Enabled");
            case SchemaType.dll:
                return ConfigHelper.config.get("fileTypes.Dll.Enabled");
            case SchemaType.entity:
                return ConfigHelper.config.get("fileTypes.Entity.Enabled");
            case SchemaType.sourceCode:
                return ConfigHelper.config.get("fileTypes.SourceCode.Enabled");
            case SchemaType.sqlScript:
                return ConfigHelper.config.get("fileTypes.SqlScript.Enabled");
            case SchemaType.process:
                return ConfigHelper.config.get("fileTypes.Process.Enabled");
            case SchemaType.processUserTask:
                return ConfigHelper.config.get("fileTypes.ProcessUserTask.Enabled");
            default:
                return undefined;
        }
    }

    public static isFileTypeEnabled(type: SchemaType) {
        switch (type) {
            case SchemaType.clientUnit:
                return ConfigHelper.config.get("fileTypes.ClientUnit.Enabled");
            case SchemaType.case:
                return ConfigHelper.config.get("fileTypes.Case.Enabled");
            case SchemaType.data:
                return ConfigHelper.config.get("fileTypes.Data.Enabled");
            case SchemaType.dll:
                return ConfigHelper.config.get("fileTypes.Dll.Enabled");
            case SchemaType.entity:
                return ConfigHelper.config.get("fileTypes.Entity.Enabled");
            case SchemaType.sourceCode:
                return ConfigHelper.config.get("fileTypes.SourceCode.Enabled");
            case SchemaType.sqlScript:
                return ConfigHelper.config.get("fileTypes.SqlScript.Enabled");
            case SchemaType.process:
                return ConfigHelper.config.get("fileTypes.Process.Enabled");
            case SchemaType.processUserTask:
                return ConfigHelper.config.get("fileTypes.ProcessUserTask.Enabled");
            default:
                return false;
        }
    }

    public static getLoginData(): ConnectionInfo | undefined {
        let loginData: ConnectionInfo | undefined = ConfigHelper.config.get("loginData");
        if (loginData) {
           return new ConnectionInfo(loginData.url, loginData.login, loginData.password);
        }
        return undefined;
    }

    public static setLoginData(loginData: ConnectionInfo) {
        ConfigHelper.config.update("loginData", loginData, true);
    }
}