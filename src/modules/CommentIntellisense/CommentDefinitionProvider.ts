import * as vscode from 'vscode';
import { ConfigurationHelper } from '../../common/ConfigurationHelper';

export class CommentDefinitionProvider implements vscode.DocumentLinkProvider {
    provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink[]> {
        const path = ConfigurationHelper.getOpenCommentPath();
        if (ConfigurationHelper.getOpenCommentPathEnabled() && path) {
            let regExpString = ConfigurationHelper.getRegexCommentPath();
            if (regExpString) {
                const text = document.getText();
                const regExp = new RegExp(regExpString, "g");
                let matches = [...text.matchAll(regExp)];

                let links = matches.map(match => {
                    let link = new vscode.DocumentLink(new vscode.Range(document.positionAt(match.index!), document.positionAt(match.index! + match[0].length)));
                    const uri = path.replace("${0}", match[1].toString());
                    link.tooltip = "Open " + uri;
                    link.target = vscode.Uri.parse(uri);
                    return link;
                });

                return links;
            }
        } else {
            return null;
        }
    }
}