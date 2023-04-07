import * as vscode from "vscode";
import { CreatioCodeContext } from "../../globalContext";
import { Entry, File, Directory } from '../../modules/FileSystem/ExplorerItem';


export class CreatioExplorerDecorationProvider
    implements vscode.FileDecorationProvider {
    
    constructor() {
        CreatioCodeContext.fsProvider.onDidChangeFile(
            (events: vscode.FileChangeEvent[]) => {
                events.forEach((event) => {
                    if (event.type === vscode.FileChangeType.Changed) {
                        this._fireSoon(event.uri);
                    }
                });
            }
        );
    }
    
    provideFileDecoration(
        uri: vscode.Uri,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FileDecoration> {
        if (uri.scheme === "creatio") {
            const file = CreatioCodeContext.fsProvider.getMemFile(uri);
            const folder = CreatioCodeContext.fsProvider.getMemFolder(uri);
            if (file) {
                return this.buildFileDecoration(file);
            } else if (folder) {
                // No decorations needed yet
            } else {
                // Something really bad happened
                return {
                    badge: "Err",
                    tooltip: "Selected resource is not file nor folder",
                };
            }
        }

        return undefined;
    }

    buildFileDecoration(file: File): vscode.FileDecoration {
        let badge = "";
        let tooltipItems = [];

        if (file.workSpaceItem.isChanged) {
            badge += "*";
            tooltipItems.push("Changed");
        }

        if (file.workSpaceItem.isLocked) {
            badge += "🔒";
            tooltipItems.push("Locked");
        }

        let color = file.isError
            ? new vscode.ThemeColor("list.errorForeground")
            : undefined;

        return new vscode.FileDecoration(badge, tooltipItems.join("|"), color);
    }

    private _emitter = new vscode.EventEmitter<vscode.Uri[]>();
    private _bufferedEvents: vscode.Uri[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri[]> =
        this._emitter.event;

    _fireSoon(...events: vscode.Uri[]): void {
        this._bufferedEvents.push(...events);

        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }

        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0;
        }, 5);
    }
}