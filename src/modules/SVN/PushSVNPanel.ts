import { GenericWebViewProvider } from "../../common/WebView/GenericWebViewProvider";
import * as vscode from 'vscode';
import { CreatioClient } from "../../creatio-api/CreatioClient";
import { ConfigurationHelper } from "../../common/ConfigurationHelper";
import path from "path";
import { CreatioFileSystemProvider } from "../FileSystem/CreatioFileSystemProvider";
import { ConnectionInfo } from "../../creatio-api/ConnectionInfo";
import { CreatioCodeUtils } from "../../common/CreatioCodeUtils";
import { GenericWebViewPanel } from "../../common/WebView/GenericWebViewPanel";
import { PackageChangeEntry } from "../../creatio-api/CreatioTypeDefinitions";
import { CreatioCodeContext } from "../../globalContext";

export class PushToSVNPanel extends GenericWebViewPanel {
    changes: PackageChangeEntry;
    packageName: string;

    public constructor(context: vscode.ExtensionContext, packageName: string, changes: PackageChangeEntry) {
        super(context);
        this.changes = changes;
        this.packageName = packageName;
    }

    protected webViewId = "creatiocode.pushToSVNPanel";
    protected title = "Push to SVN";

    protected onDidReceiveMessage = async (message: any) => {
        switch (message.command) {
            case 'commit':
                CreatioCodeContext.fsProvider.commit(this.packageName, message.message);
                this.dispose();
                break;
            case 'getChanges':
                this.postMessage(this.changes);
                break;

        }
    };

    protected getWebviewContent(): string {
        return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <script src = '${this.getResourcePath("js", "PushToSVNPanel.js")}'></script>
                <link rel="stylesheet" href="${this.getResourcePath("css", "PushToSVNPanel.css")}">
            </head>
            <body>
            </body>
        </html>
        `;
    }
}