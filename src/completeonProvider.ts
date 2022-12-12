/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as http from 'http';
import * as vm from 'vm';
import { CreatioFS } from './ViewProviders/fs/fileSystemProvider';

const browserEnv = require('browser-env');
var beautify = require('js-beautify').js;

class ScriptFetcher {
    static async getScriptEnviroment() {
        const scripts = await this.loadAllScripts('/0/Nui/ViewModule.aspx');
        let eviroment = vm.createContext(browserEnv());
        scripts.forEach(src => {
            // append script tags to the DOM enviroment
            const script = eviroment.document.createElement('script');
            script.src = src;
            eviroment.document.body.appendChild(script);
        });
        const values = await this.evalScripts(scripts, eviroment);

        const Terrasoft = values.Terrasoft;
        const Ext = values.Ext;

        return {
            "Terrasoft": Terrasoft,
            "Ext": Ext
        };
    }

    static async evalScripts(scripts: string[], eviroment: any): Promise<NodeJS.Dict<any>> {
        let context = vm.createContext(eviroment);
        scripts.forEach(code => {
            try {
                vm.runInContext(beautify(code), context);
            } catch (err) {
                console.error(err);
            }
        });
        return context;
    }

    static async loadAllScripts(path: string): Promise<string[]> {
        const basePage = await this.loadPage(path);
        const scriptSrcs = await this.getPageScrpts(basePage);
        const scripts = await this.loadScripts(scriptSrcs);
        return scripts;
    }

    static async loadScripts(scripts: string[]): Promise<string[]> {
        const promises = scripts.map(x => this.loadScript(x));
        const result = await Promise.all(promises);
        return result;
    }

    static async loadScript(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const options: http.RequestOptions = {
                host: CreatioFS.getInstance().client?.credentials.getHostName(),
                path: path,
                method: 'GET',
            };

            const req = http.request(options, (response) => {
                var str = '';
                response.on('data', function (chunk) {
                    str += chunk;
                });

                response.on('end', function () {
                    try {
                        resolve(str);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }

    static getPageScrpts(page: string): string[] {
        let scriptTags = page.match(/<script.*?src=".*?".*?<\/script>/g);
        if (!scriptTags) {return [];}
        // Get script src
        scriptTags = scriptTags.map(x => {
            const src = x.match(/src=".*?"/g);
            if (src) {
                return src[0].replace('src="', '').replace('"', '');
            }
            return '';
        });

        if (!scriptTags) {
            return [];
        }
        return scriptTags;
    }

    static loadPage(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const options: http.RequestOptions = {
                host: CreatioFS.getInstance().client?.credentials.getHostName(),
                path: path,
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'Accept-Language': "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                    "cache-control": "max-age=0",
                    "upgrade-insecure-requests": "1",
                    "Cookie": CreatioFS.getInstance().client?.cookies.join(';'),
                    "Connection": "keep-alive",
                },
            };

            const req = http.request(options, (response) => {
                var str = '';
                response.on('data', function (chunk) {
                    str += chunk;
                });

                response.on('end', function () {
                    try {
                        resolve(str);
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }
}

export class CreatioCompletionProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
    env?: { Terrasoft: any; Ext: any; };

    private static instance: CreatioCompletionProvider;
    public static getInstance(): CreatioCompletionProvider {
        if (!CreatioCompletionProvider.instance) {
            CreatioCompletionProvider.instance = new CreatioCompletionProvider();
        }
        return CreatioCompletionProvider.instance;
    }

    async init() {
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title: "Loading advanced intellisense",
            },
            async (progress, token) => {
                progress.report({
                    message: "Loading scripts",
                    increment: 0
                });
                this.env = await ScriptFetcher.getScriptEnviroment();
            }
        );
    }

    getCompletionItems(objectChain: string[]): vscode.CompletionItem[] {
        const completionItems: vscode.CompletionItem[] = [];
        let currentObject: any = this.env;
        for (let i = 0; i < objectChain.length && currentObject; i++) {
            const nextObj = objectChain[i];
            currentObject = currentObject[nextObj];
        }
        if (currentObject) {
            Object.entries(currentObject).forEach((entry) => {
                const key = entry[0];
                const value = entry[1];
                const completionItem = new vscode.CompletionItem(key);
                completionItem.kind = this.mapJsTypeToCompletionItemKind(typeof(value));
                completionItem.documentation = "Dynamically loaded from server";
                completionItem.preselect = true;
                completionItems.push(completionItem);
            });
        }
        return completionItems;
    }

    private mapJsTypeToCompletionItemKind(type: string): vscode.CompletionItemKind {
        switch (type) {
            case 'string':
                return vscode.CompletionItemKind.Property;
            case 'number':
                return vscode.CompletionItemKind.Property;
            case 'boolean':
                return vscode.CompletionItemKind.Property;
            case 'function':
                return vscode.CompletionItemKind.Method;
            case 'object':
                return vscode.CompletionItemKind.Class;
            default:
                return vscode.CompletionItemKind.Text;
        }
    }

    private parseObjectString(objectString: string): string[] {
        const cleanString = objectString.replace(/\s+/, "");
        return cleanString.split('.').filter(x => x.length > 0);
    }

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext):  vscode.CompletionItem[] { 
        const objectChain = this.parseObjectString(document.lineAt(position).text.substring(0, position.character));
        
        if (objectChain.length > 0 && this.env) {
            // Check if root object is in env
            if (Object.keys(this.env).includes(objectChain[0])) {
                return this.getCompletionItems(objectChain);
            }
        }

        return [];
    }
}