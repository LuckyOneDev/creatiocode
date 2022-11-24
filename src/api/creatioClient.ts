/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as http from 'http';
import { ClientPostResponse, CreatioResponse, GetPackagesResponse, GetSchemaResponse, GetWorkspaceItemsResponse, PackageMetaInfo, SaveSchemaResponse, Schema, WorkSpaceItem, SchemaType, ReqestType } from './creatioTypes';
import { CreatioStatusBar } from '../common/statusBar';
import { retryAsync, wait } from 'ts-retry';
import { createAsyncQueue } from './asyncQueue';
import { ConfigHelper } from '../common/configurationHelper';

export class ConnectionInfo {
	url: string;
	login: string;
	password: string;

	private hostURL: URL;

	constructor(url: string, login: string, password: string) {
		this.url = url;
		this.login = login;
		this.password = password;
		this.hostURL = new URL(this.url);
	}

	public getHostName(): string {
		return this.hostURL.hostname;
	}

	public getPort(): string {
		return this.hostURL.port;
	}
}

export class CreatioClient {
	readonly userAgent: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36";
	private requestQueue = createAsyncQueue<any>();

	cookies: any;
	BPMCSRF: string = '';
	credentials: ConnectionInfo;
	

	isConnected(): boolean {
		return this.BPMCSRF !== '';
	}

	getRequestUrl(type: ReqestType): string {
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

	async executeCreatioCommand<ResponseType extends CreatioResponse>(type: ReqestType, data: any): Promise<ResponseType | null> {
		try {
			if (type === ReqestType.login) {
				return await this.tryLogin(data);
			}
			return this.requestQueue.push(async () => { return (await this.trySendApiRequest<ResponseType>(this.getRequestUrl(type), data)).body; });
		} catch (err: any) {
			console.error(err);
			vscode.window.showErrorMessage(err.message || err.body);
			return null;
		}
	}

	private async tryLogin(data: any) {
		let response: any = await retryAsync(() => this.post(this.getRequestUrl(ReqestType.login), data), ConfigHelper.getRetryPolicy());

		if (response.response.statusCode !== 200) {
			console.error(response.body);
			throw Error(response.response.statusMessage);
		}

		if (response.body.Code === 1) {
			throw Error(response.body.Message);
		}

		this.setCookies(response.response.headers['set-cookie']);
		return response;
	}

	constructor(credentials: ConnectionInfo) {
		this.credentials = credentials;
	}

	getBPMCSRF(): string {
		return this.cookies.find((x: any) => x.startsWith('BPMCSRF')).split(';')[0].split('=')[1];
	}

	private post(path: string, postData: any = null): any {
		return new Promise((resolve, reject) => {
			if (postData) { postData = JSON.stringify(postData); }

			const options: http.RequestOptions = {
				host: this.credentials.getHostName(),
				path: path,
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
					'Content-Length': postData ? Buffer.byteLength(postData) : 0,
				}
			};

			if (this.credentials.getPort() !== '') {
				options.port = this.credentials.getPort();
			}

			const req = http.request(options, (response) => {
				var str = '';
				response.on('data', function (chunk) {
					str += chunk;
				});

				response.on('end', function () {
					try {
						let body = JSON.parse(str);
						resolve({
							response: response,
							body: body
						});
					} catch (err) {
						reject({
							response: response,
							body: str
						});
					}
				});
			});

			req.on('error', reject);

			if (postData) { req.write(postData); }
			req.end();
		});
	}

	sendApiRequest(path: string, postData: any = null, contentType = 'application/json'): Promise<any> {
		return new Promise((resolve, reject) => {
			if (postData) { postData = JSON.stringify(postData); }

			var options: http.RequestOptions = {
				host: this.credentials.getHostName(),
				path: path,
				method: 'POST',
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Content-Length': postData ? Buffer.byteLength(postData) : 0,
					'BPMCSRF': this.BPMCSRF,
					"User-Agent": this.userAgent,
					"Cookie": this.cookies.join(';'),
					"Content-Type": contentType
				}
			};

			if (this.credentials.getPort() !== '') {
				options.port = this.credentials.getPort();
			}

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

	setCookies(cookies: any) {
		this.cookies = cookies;
		this.BPMCSRF = this.getBPMCSRF();
	}

	async login(): Promise<boolean> {
		const postData = {
			"UserName": this.credentials.login,
			"UserPassword": this.credentials.password
		};
		let response = await this.executeCreatioCommand(ReqestType.login, postData);
		if (response) {
			CreatioStatusBar.update('Connected to Creatio');
			return true;
		} else {
			return false;
		}
	}

	async getCurrentUserInfo() {
		try {
			return await this.sendApiRequest(this.getRequestUrl(ReqestType.getCurrentUserInfo));
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getApplicationInfo() {
		try {
			return await this.sendApiRequest(this.getRequestUrl(ReqestType.getApplicationInfo));
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getPackages(): Promise<Array<PackageMetaInfo>> {
		let response = await this.trySendApiRequest<GetPackagesResponse>(this.getRequestUrl(ReqestType.getPackages));
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

	async trySendApiRequest<ResponseType extends CreatioResponse>(path: string, postData: any = null): Promise<ClientPostResponse<ResponseType>> {
		if (!this.cookies || this.cookies.length === 0 || this.isConnected() === false) {
			await this.login();
		}

		let response = await retryAsync(() => this.sendApiRequest(path, postData), ConfigHelper.getRetryPolicy());

		if (response.response.statusCode === 401) {
			await this.login();
			return await this.trySendApiRequest(path, postData);
		} else if (response.response.statusCode !== 200) {
			console.error(response.body);
			throw Error(response.response.statusMessage);
		}

		if (!this.isJSON(response.body)) {
			console.error(response.body);
			throw Error("Provided response is not a valid JSON string. See console for details.");
		}

		response.body = JSON.parse(response.body);

		if (response.body.success === false) {
			console.error(response.body);
			throw Error(response.body.errorInfo.message);
		}

		return response as ClientPostResponse<ResponseType>;
	}

	async getWorkspaceItems(): Promise<Array<WorkSpaceItem>> {
		let response = await this.trySendApiRequest<GetWorkspaceItemsResponse>('/0/ServiceModel/WorkspaceExplorerService.svc/GetWorkspaceItems');
		return response ? response.body.items : [];
	}

	async selectQuery(sql: string): Promise<any> {
		const payload = {
			"script": sql
		};
		let response = await this.trySendApiRequest<CreatioResponse>('/0/DataService/json/SyncReply/SelectQuery', payload);
		return response?.body;
	}
	async revertElements(schemas: Array<WorkSpaceItem>): Promise<CreatioResponse | undefined> {
		let response = await this.trySendApiRequest<CreatioResponse>('/0/ServiceModel/SourceControlService.svc/RevertElements', schemas);
		return response?.body;
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
				break;
			case SchemaType.data:
				svcPath = '/0/ServiceModel/SchemaDataDesignerService.svc/GetSchema';
				break;
			default:
				return null; //throw new Error("Invalid schema type");
		}

		try {
			response = await this.trySendApiRequest<GetSchemaResponse>(svcPath, payload);
			return response.body.schema;
		}
		catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return null;
		}
	}

	async build() {
		try {
			return await this.sendApiRequest('/0/ServiceModel/WorkspaceExplorerService.svc/Build');
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
			return await this.sendApiRequest('/0/ServiceModel/SourceControlService.svc/GetPackageState', postData);
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
			return await this.sendApiRequest('/0/ServiceModel/SourceControlService.svc/Update', postData);
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async exportSchema(schemaDatas: Array<any>) {
		try {
			return await this.sendApiRequest('/0/ServiceModel/SourceControlService.svc/GetPackageState', schemaDatas);
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
			return await this.sendApiRequest('/0/ServiceModel/SourceControlService.svc/GetRepositories');
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
			return await this.sendApiRequest('/0/DataService/json/SyncReply/QuerySysSettings', postData);
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
			return await this.sendApiRequest('/0/ServiceModel/SchemaMetaDataService.svc/GetSchemaMetaData', postData);
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
			return await this.sendApiRequest('/0/DataService/json/SyncReply/QuerySysSettings', postData);
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

	async saveSchema(schema: Schema): Promise<SaveSchemaResponse | null> {
		return await this.executeCreatioCommand<SaveSchemaResponse>(ReqestType.saveSchema, schema);
	}

	async getAvailableReferenceSchemas(id: string) {
		try {
			return await this.sendApiRequest('/0/ServiceModel/EntitySchemaDesignerService.svc/GetAvailableReferenceSchemas', id);
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getPackageProperties(id: string) {
		try {
			return await this.sendApiRequest('/0/ServiceModel/PackageService.svc/GetPackageProperties', id);
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getSchemaNamePrefix() {
		return (await this.querySysSettings(["SchemaNamePrefix"])).body.values.SchemaNamePrefix;
	}
}