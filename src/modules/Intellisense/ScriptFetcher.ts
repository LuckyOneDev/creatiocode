/* eslint-disable @typescript-eslint/naming-convention */
import * as http from 'http';
import * as vm from 'vm';
import { CreatioFileSystemProvider } from '../FileSystem/CreatioFileSystemProvider';

const browserEnv = require('browser-env');
var beautify = require('js-beautify').js;

export class ScriptFetcher {
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
                host: CreatioFileSystemProvider.getInstance().client?.credentials.getHostName(),
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

    static loadPage(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const options: http.RequestOptions = {
                host: CreatioFileSystemProvider.getInstance().client?.credentials.getHostName(),
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