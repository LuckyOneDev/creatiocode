import * as vscode from 'vscode';
import { GenericWebViewPanel } from "../../../common/WebView/GenericWebViewPanel";
import { PackageChangeEntry } from "../../../creatio-api/CreatioTypeDefinitions";

export class SimplePanel extends GenericWebViewPanel {
    content: string;

    genid(length: number) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
          counter += 1;
        }
        return result;
    }

    
    public constructor(context: vscode.ExtensionContext, title: string, content: string) {
        super(context);
        this.content = content;
        this.title = title;
        this.webViewId = "_" + this.genid(10);
    }

    protected webViewId;
    protected title;

    protected onDidReceiveMessage = async (message: any) => {};

    protected getWebviewContent(): string {
        return this.content;
    }
}