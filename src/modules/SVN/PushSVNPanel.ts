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

export class PushToSVNPanel extends GenericWebViewPanel {
    changes: PackageChangeEntry[];

    public constructor(context: vscode.ExtensionContext, changes: PackageChangeEntry[]) {
        super(context);
        this.changes = changes;
    }

    protected webViewId = "creatiocode.pushToSVNPanel";
    protected title = "Push to SVN";

    protected onDidReceiveMessage = async (message: any) => {
        switch (message.command) {
            case 'push':
                // Nothing
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