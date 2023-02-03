/* eslint-disable @typescript-eslint/naming-convention */
import * as http from 'http';
import * as vm from 'vm';
import { CreatioFileSystemProvider } from '../FileSystem/CreatioFileSystemProvider';
import beautify from 'js-beautify';
import browserEnv from '@ikscodes/browser-env';


export class ScriptFetcher {
    public static async getDefaultScriptEnviroment() {
        const values = await this.getPageScriptEnv('/0/Nui/ViewModule.aspx');
        const finalObject = this.prepareEnviromentCollection(values);
        return finalObject;
    }

    public static async getPageScriptEnv(url: string) {
        const scripts = await this.loadAllScripts(url);
        let eviroment: any = browserEnv();

        scripts.forEach(src => {
            // append script tags to the DOM enviroment
            const script = eviroment.document.createElement('script');
            script.src = src;
            eviroment.document.body.appendChild(script);
        });
        const values = await this.evalScripts(scripts, eviroment, browserEnv());
        return values;
    }

    public static async evalScripts(scripts: string[], eviroment: NodeJS.Dict<any>, compareTo: NodeJS.Dict<any>): Promise<NodeJS.Dict<any>> {
        let context = vm.createContext(eviroment);
        for (const script of scripts) {
            try {
                vm.runInContext(beautify(script), context);
            } catch (err) {
                console.error(`Error while evaluating script:\n${err}`);
            }
        }

        let dict = vm.createContext();

        for (const property in context) {
            if (!compareTo.hasOwnProperty(property)) {
                dict[property] = context[property];
            }
        };

        return dict;
    }

    private static async loadScripts(scripts: string[]): Promise<string[]> {
        const promises = scripts.map(x => this.loadScript(x));
        const result = await Promise.all(promises);
        return result;
    }

    private static async loadScript(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const options: http.RequestOptions = {
                host: CreatioFileSystemProvider.getInstance().client?.connectionInfo.getHostName(),
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

    private static prepareEnviromentCollection(collection: NodeJS.Dict<any>) {
        const finalObject = Object.assign({
            "this": {
                "Terrasoft": collection.Terrasoft,
                "Ext": collection.Ext
            }
        }, collection);
        return finalObject;
    }

    private static async loadAllScripts(url: string): Promise<string[]> {
        const basePage = await this.loadPage(url);
        const scriptSrcs = await this.getPageScrpts(basePage);
        const scripts = await this.loadScripts(scriptSrcs);
        return scripts;
    }

    private static getPageScrpts(page: string): string[] {
        let scriptTags = page.match(/<script.*?src=".*?".*?<\/script>/g);
        if (!scriptTags) {
            return [];
        }

        let stringTags = scriptTags.map(x => {
            const src = x.match(/src=".*?"/g);
            if (src) {
                return src[0].replace('src="', '').replace('"', '');
            }
            return '';
        });

        if (!stringTags) {
            return [];
        }
        return stringTags;
    }

    private static loadPage(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const options: http.RequestOptions = {
                host: CreatioFileSystemProvider.getInstance().client?.connectionInfo.getHostName(),
                path: path,
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'Accept-Language': "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                    "cache-control": "max-age=0",
                    "upgrade-insecure-requests": "1",
                    "Cookie": CreatioFileSystemProvider.getInstance().client?.cookies.join(';'),
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