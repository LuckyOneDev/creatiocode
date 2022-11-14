/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as http from 'http';
import { ClientPostResponse, CreatioResponse, GetPackagesResponse, GetSchemaResponse, GetWorkspaceItemsResponse, PackageMetaInfo, SaveSchemaResponse, Schema, WorkSpaceItem, SchemaType, ReqestType } from './creatioInterfaces';
import { CreatioStatusBar } from '../statusBar';

export class CreatioClient {
	readonly userAgent: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36";

	cookies: any;
	credentials: any;
	connected: boolean = false;

	getRequsetUrl(type: ReqestType) {
		switch (type) {
			case ReqestType.getCurrentUserInfo: return '/0/ServiceModel/UserInfoService.svc/GetCurrentUserInfo';
			case ReqestType.getApplicationInfo: return '/0/ServiceModel/ApplicationInfoService.svc/GetApplicationInfo';
			case ReqestType.getPackages: return '/0/ServiceModel/PackageService.svc/GetPackages';
			case ReqestType.getWorkspaceItems: return '/0/ServiceModel/WorkspaceExplorerService.svc/GetWorkspaceItems';
			case ReqestType.revertElements: return '/0/ServiceModel/SourceControlService.svc/RevertElements';
			case ReqestType.getPackageState: return '/0/ServiceModel/SourceControlService.svc/GetPackageState';
			case ReqestType.getSchemaMetaData: return '/0/ServiceModel/SchemaMetaDataService.svc/GetSchemaMetaData';
			case ReqestType.saveSchema: return '/0/ServiceModel/ClientUnitSchemaDesignerService.svc/SaveSchema';
			case ReqestType.getAvailableReferenceSchemas: return '/0/ServiceModel/EntitySchemaDesignerService.svc/GetAvailableReferenceSchemas';
			case ReqestType.login: return '/ServiceModel/AuthService.svc/Login';
			case ReqestType.selectQuery: return '/DataService/json/SyncReply/SelectQuery';
			case ReqestType.insertQuery: return '/DataService/json/SyncReply/InsertQuery';
			case ReqestType.deleteQuery: return '/DataService/json/SyncReply/DeleteQuery';
			case ReqestType.updateQuery: return '/DataService/json/SyncReply/UpdateQuery';
			case ReqestType.runProcess: return '/0/ServiceModel/ProcessEngineService.svc/RunProcess';
			case ReqestType.processSchemaRequest: return '/0/ServiceModel/ProcessSchemaRequestService.svc/ProcessSchemaRequest';
			case ReqestType.processSchemaParameter: return '/0/DataService/json/SyncReply/ProcessSchemaParameter';
			case ReqestType.runtimeEntitySchemaRequest: '/0/DataService/json/SyncReply/RuntimeEntitySchemaRequest';
			case ReqestType.entitySchemaManagerRequest: '/0/DataService/json/SyncReply/EntitySchemaManagerRequest';
			case ReqestType.restartApp: '/0/ServiceModel/AppInstallerService.svc/RestartApp';
			case ReqestType.clearRedisDb: '/0/ServiceModel/AppInstallerService.svc/ClearRedisDb';
			case ReqestType.executeSqlScript: '/0/rest/CreatioApiGateway/ExecuteSqlScript';
			case ReqestType.pingWebHost: '/0/api/HealthCheck/Ping';
			case ReqestType.pingWebApp: '/api/HealthCheck/Ping';
			case ReqestType.getPackageProperties: '/0/ServiceModel/PackageService.svc/GetPackageProperties';
			case ReqestType.getClientUnitSchema: '/0/ServiceModel/ClientUnitSchemaDesignerService.svc/GetSchema';
			case ReqestType.getSqlSchema: '/0/ServiceModel/SqlScriptSchemaDesignerService.svc/GetSchema';
			case ReqestType.setFeatureState: '/0/rest/FeatureStateService/SetFeatureState';
			case ReqestType.startLogBroadcast: '/0/rest/ATFLogService/StartLogBroadcast';
			case ReqestType.stopLogBroadcast: '/0/rest/ATFLogService/ResetConfiguration';
			default: return '';
		}
	}

	async executeCreatioCommand<ResponseType extends CreatioResponse>(type: ReqestType, data: any) {
		return await this.trySendClientPost<ResponseType>(this.getRequsetUrl(type), data);
	}

	constructor(credentials: any) {
		this.credentials = credentials;
	}

	sendPost(path: string, postData: any = null): any {
		return new Promise((resolve, reject) => {
			if (postData) { postData = JSON.stringify(postData); }

			const options = {
				host: this.credentials.url,
				path: path,
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
					'Content-Length': postData ? Buffer.byteLength(postData) : 0,
				}
			};

			const req = http.request(options, (response) => {
				var str = '';
				response.on('data', function (chunk) {
					str += chunk;
				});

				response.on('end', function () {
					resolve({
						response: response,
						body: JSON.parse(str)
					});
				});
			});

			req.on('error', reject);

			if (postData) { req.write(postData); }
			req.end();
		});
	}

	getBPMCSRF() {
		return this.cookies.find((x: any) => x.startsWith('BPMCSRF')).split(';')[0].split('=')[1];
	}

	sendClientPost(path: string, postData: any = null, contentType = 'application/json'): Promise<any> {
		return new Promise((resolve, reject) => {
			if (postData) { postData = JSON.stringify(postData); }

			var options = {
				host: this.credentials.url,
				path: path,
				method: 'POST',
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Content-Length': postData ? Buffer.byteLength(postData) : 0,
					'BPMCSRF': this.getBPMCSRF(),
					"User-Agent": this.userAgent,
					"Cookie": this.cookies.join(';'),
					"Content-Type": contentType
				},
				mode: "cors",
				credentials: "include"
			};

			const req = http.request(options, (response) => {
				var str = '';
				response.on('data', function (chunk) {
					str += chunk;
				});

				response.on('end', function () {
					try {
						resolve({
							response: response,
							body: str
						});
					} catch (err) {
						reject(err);
					}

				});

			});

			req.on('error', x => reject(x));

			if (postData) { req.write(postData); }
			req.end();
		});
	}

	async connect(): Promise<boolean> {
		const postData = {
			"UserName": this.credentials.login,
			"UserPassword": this.credentials.password
		};
		let response = await this.sendPost('/ServiceModel/AuthService.svc/Login', postData);
		this.cookies = response.response.headers['set-cookie'];
		let flag = response.body.Message === "";
		if (flag) {
			CreatioStatusBar.update('Connected to Creatio');
		} else {
			vscode.window.showErrorMessage('Invalid login or password');
		}
		this.connected = flag;
		return flag;
	}

	async getCurrentUserInfo() {
		try {
			return await this.sendClientPost(this.getRequsetUrl(ReqestType.getCurrentUserInfo));
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getApplicationInfo() {
		try {
			return await this.sendClientPost(this.getRequsetUrl(ReqestType.getApplicationInfo));
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getPackages(): Promise<Array<PackageMetaInfo>> {
		let response = await this.trySendClientPost<GetPackagesResponse>(this.getRequsetUrl(ReqestType.getPackages));
		return response ? response.body.packages.map((x: any) => { return x; }) : [];
	}

	isJSON(text: string): any {
		try {
			JSON.parse(text);
		} catch (e) {
			return false;
		}
		return true;
	}

	async trySendClientPost<ResponseType extends CreatioResponse>(path: string, postData: any = null): Promise<ClientPostResponse<ResponseType>> {
		let response = await this.retryOperation(() => this.sendClientPost(path, postData), 25, 5);

		if (response.response.statusCode !== 200) {
			response.body = {};
			response.body.errorInfo = {
				errorCode: "http:" + response.response.statusCode,
				message: response.response.statusMessage,
				stackTrace: ""
			};
			response.body.success = false;
			return response;
		}

		if (!this.isJSON(response.body)) {
			console.error(response.body);
			response.body = {};
			response.body.errorInfo = {
				errorCode: "JSON",
				message: "Provided response is not a valid JSON string. See console for details.",
				stackTrace: ""
			};
			response.body.success = false;
			return response;
		}

		response.body = JSON.parse(response.body);
		return response as ClientPostResponse<ResponseType>;
	}

	async getWorkspaceItems(): Promise<Array<WorkSpaceItem>> {
		let response = await this.trySendClientPost<GetWorkspaceItemsResponse>('/0/ServiceModel/WorkspaceExplorerService.svc/GetWorkspaceItems');
		return response ? response.body.items : [];
	}

	async selectQuery(sql: string): Promise<any> {
		const payload = {
			"script": sql
		};
		let response = await this.trySendClientPost<CreatioResponse>('/0/DataService/json/SyncReply/SelectQuery', payload);
		return response?.body;
	}
	async revertElements(schemas: Array<WorkSpaceItem>): Promise<CreatioResponse | undefined> {
		let response = await this.trySendClientPost<CreatioResponse>('/0/ServiceModel/SourceControlService.svc/RevertElements', schemas);
		return response?.body;
	}

	wait(ms: number) {
		return new Promise(r => setTimeout(r, ms));
	}

	retryOperation<T>(operation: () => Promise<T>, delay: number, retries: number): Promise<T> {
		return new Promise((resolve, reject) => {
			return  operation()
				.then(resolve)
				.catch((reason: any) => {
					if (retries > 0) {
						return this.wait(delay)
							.then(this.retryOperation.bind(null, operation, delay, retries - 1))
							.catch(reject);
					}
					return reject(reason);
				});
		});
	}

	async getSchema(schemaUId: string, type: SchemaType): Promise<Schema | null> {
		const payload = {
			"schemaUId": schemaUId
		};

		let response: any;
		let svcPath = "";

		switch (type) {
			case SchemaType.clientUnit:
				svcPath = '/0/ServiceModel/ClientUnitSchemaDesignerService.svc/GetSchema';
				break;
			case SchemaType.sourceCode:
				svcPath = '/0/ServiceModel/SourceCodeSchemaDesignerService.svc/GetSchema';
				break;
			case SchemaType.sqlScript:
				svcPath = '/0/ServiceModel/SqlScriptSchemaDesignerService.svc/GetSchema';
				break;
			case SchemaType.processUserTask:
				svcPath = '/0/ServiceModel/ProcessUserTaskSchemaDesignerService.svc/GetSchema';
				break;
			case SchemaType.entity:
				svcPath = '/0/ServiceModel/EntitySchemaDesignerService.svc/GetSchema';
				response = await this.trySendClientPost<GetSchemaResponse>(svcPath, payload);
				return response.body.schema;
			case SchemaType.data:
				svcPath = '/0/ServiceModel/SchemaDataDesignerService.svc/GetSchema';
				response = await this.trySendClientPost<GetSchemaResponse>(svcPath, payload);
				return response.body.schema;
			default:
				throw new Error("Invalid schema type");
		}

		response = await this.trySendClientPost<GetSchemaResponse>(svcPath, payload);
		if (response?.body.schema) {
			return response.body.schema;
		} else {
			throw new Error("Invalid schema response");
		}
	}

	async build() {
		try {
			return await this.sendClientPost('/0/ServiceModel/WorkspaceExplorerService.svc/Build');
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	/**
	 * 
	 * @param {String} packageName 
	 * @returns 
	 */
	async getPackageState(packageName: string) {
		const postData = {
			"packageName": packageName,
		};
		try {
			return await this.sendClientPost('/0/ServiceModel/SourceControlService.svc/GetPackageState', postData);
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	/**
	  * 
	* @param {String} packageName 
	* @returns 
	*/
	async updatePackage(packageName: string) {
		const postData = {
			"packageName": packageName,
		};
		try {
			return await this.sendClientPost('/0/ServiceModel/SourceControlService.svc/Update', postData);
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async exportSchema(schemaDatas: Array<any>) {
		try {
			return await this.sendClientPost('/0/ServiceModel/SourceControlService.svc/GetPackageState', schemaDatas);
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	/**
	 * 
	 * @returns Repository data array
	 */
	async getRepositories() {
		try {
			return await this.sendClientPost('/0/ServiceModel/SourceControlService.svc/GetRepositories');
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async querySysSettings(settingNames: Array<String>): Promise<any> {
		const postData = {
			"sysSettingsNameCollection": settingNames
		};
		try {
			return await this.sendClientPost('/0/DataService/json/SyncReply/QuerySysSettings', postData);
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getSchemaMetaData(schemaUId: String, packageUId: String, schemaType: Number = 4) {
		const postData = {
			schemaUId: schemaUId,
			packageUId: packageUId,
			schemaType: schemaType
		};
		try {
			return await this.sendClientPost('/0/ServiceModel/SchemaMetaDataService.svc/GetSchemaMetaData', postData);
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getAvailableParentSchemas(packageUId: String, schemaType: Number = 2, allowExtended = false) {
		const postData = {
			"packageUId": packageUId,
			"allowExtended": allowExtended,
			"schemaType": schemaType
		};

		try {
			return await this.sendClientPost('/0/DataService/json/SyncReply/QuerySysSettings', postData);
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async deleteSchema(schemaDatas: Array<any>) {
		try {
			throw new Error('Not implemented');
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async saveSchema(schema: Schema): Promise<SaveSchemaResponse> {
		let response = await this.trySendClientPost<SaveSchemaResponse>('/0/ServiceModel/ClientUnitSchemaDesignerService.svc/SaveSchema', schema);
		return response.body;
	}

	async getAvailableReferenceSchemas(id: string) {
		try {
			return await this.sendClientPost('/0/ServiceModel/EntitySchemaDesignerService.svc/GetAvailableReferenceSchemas', id);
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getPackageProperties(id: string) {
		try {
			return await this.sendClientPost('/0/ServiceModel/PackageService.svc/GetPackageProperties', id);
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getSchemaNamePrefix() {
		return (await this.querySysSettings(["SchemaNamePrefix"])).body.values.SchemaNamePrefix;
	}
}