/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as http from 'http';
import * as CreatioType from './CreatioTypeDefinitions';
import { CreatioStatusBar } from '../common/CreatioStatusBar';
import { retryAsync, wait } from 'ts-retry';
import { createAsyncQueue } from '../common/AsyncQueue';
import { ConfigurationHelper } from '../common/ConfigurationHelper';
import { ConnectionInfo } from './ConnectionInfo';

export class CreatioClient {
	readonly userAgent: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36";
	private requestQueue = createAsyncQueue<any>();

	cookies: any;
	BPMCSRF: string = '';
	credentials: ConnectionInfo;

	isConnected(): boolean {
		return this.BPMCSRF !== '';
	}

	getRequestUrl(type: CreatioType.ReqestType): string {
		switch (type) {
			case CreatioType.ReqestType.getCurrentUserInfo: return '/0/ServiceModel/UserInfoService.svc/GetCurrentUserInfo';
			case CreatioType.ReqestType.getApplicationInfo: return '/0/ServiceModel/ApplicationInfoService.svc/GetApplicationInfo';
			case CreatioType.ReqestType.getPackages: return '/0/ServiceModel/PackageService.svc/GetPackages';
			case CreatioType.ReqestType.getWorkspaceItems: return '/0/ServiceModel/WorkspaceExplorerService.svc/GetWorkspaceItems';
			case CreatioType.ReqestType.revertElements: return '/0/ServiceModel/SourceControlService.svc/RevertElements';
			case CreatioType.ReqestType.getPackageState: return '/0/ServiceModel/SourceControlService.svc/GetPackageState';
			case CreatioType.ReqestType.getSchemaMetaData: return '/0/ServiceModel/SchemaMetaDataService.svc/GetSchemaMetaData';
			case CreatioType.ReqestType.saveSchemaClientUnit: return '/0/ServiceModel/ClientUnitSchemaDesignerService.svc/SaveSchema';
			case CreatioType.ReqestType.saveSchemaSourceCode: return '/0/ServiceModel/SourceCodeSchemaDesignerService.svc/SaveSchema';
			case CreatioType.ReqestType.getAvailableReferenceSchemas: return '/0/ServiceModel/EntitySchemaDesignerService.svc/GetAvailableReferenceSchemas';
			case CreatioType.ReqestType.login: return '/ServiceModel/AuthService.svc/Login';
			case CreatioType.ReqestType.selectQuery: return '/DataService/json/SyncReply/SelectQuery';
			case CreatioType.ReqestType.insertQuery: return '/DataService/json/SyncReply/InsertQuery';
			case CreatioType.ReqestType.deleteQuery: return '/DataService/json/SyncReply/DeleteQuery';
			case CreatioType.ReqestType.updateQuery: return '/DataService/json/SyncReply/UpdateQuery';
			case CreatioType.ReqestType.runProcess: return '/0/ServiceModel/ProcessEngineService.svc/RunProcess';
			case CreatioType.ReqestType.processSchemaRequest: return '/0/ServiceModel/ProcessSchemaRequestService.svc/ProcessSchemaRequest';
			case CreatioType.ReqestType.processSchemaParameter: return '/0/DataService/json/SyncReply/ProcessSchemaParameter';
			case CreatioType.ReqestType.runtimeEntitySchemaRequest: return '/0/DataService/json/SyncReply/RuntimeEntitySchemaRequest';
			case CreatioType.ReqestType.entitySchemaManagerRequest: return '/0/DataService/json/SyncReply/EntitySchemaManagerRequest';
			case CreatioType.ReqestType.restartApp: return '/0/ServiceModel/AppInstallerService.svc/RestartApp';
			case CreatioType.ReqestType.clearRedisDb: return '/0/ServiceModel/AppInstallerService.svc/ClearRedisDb';
			case CreatioType.ReqestType.executeSqlScript: return '/0/rest/CreatioApiGateway/ExecuteSqlScript';
			case CreatioType.ReqestType.pingWebHost: return '/0/api/HealthCheck/Ping';
			case CreatioType.ReqestType.pingWebApp: return '/api/HealthCheck/Ping';
			case CreatioType.ReqestType.getPackageProperties: return '/0/ServiceModel/PackageService.svc/GetPackageProperties';
			case CreatioType.ReqestType.getClientUnitSchema: return '/0/ServiceModel/ClientUnitSchemaDesignerService.svc/GetSchema';
			case CreatioType.ReqestType.getSqlSchema: return '/0/ServiceModel/SqlScriptSchemaDesignerService.svc/GetSchema';
			case CreatioType.ReqestType.setFeatureState: return '/0/rest/FeatureStateService/SetFeatureState';
			case CreatioType.ReqestType.startLogBroadcast: return '/0/rest/ATFLogService/StartLogBroadcast';
			case CreatioType.ReqestType.stopLogBroadcast: return '/0/rest/ATFLogService/ResetConfiguration';
			case CreatioType.ReqestType.unlockPackageElements: return '/0/ServiceModel/SourceControlService.svc/UnlockPackageElements';
			case CreatioType.ReqestType.lockPackageElements: return '/0/ServiceModel/SourceControlService.svc/LockPackageElements';
			case CreatioType.ReqestType.generateChanges: return '/0/ServiceModel/SourceControlService.svc/GenerateChanges';
			case CreatioType.ReqestType.build: return '/0/ServiceModel/WorkspaceExplorerService.svc/Build';
			case CreatioType.ReqestType.rebuild: return '/0/ServiceModel/WorkspaceExplorerService.svc/Rebuild';
			default: return '';
		}
	}

	async executeCreatioCommand<ResponseType extends CreatioType.CreatioResponse>(type: CreatioType.ReqestType, data: any): Promise<ResponseType | null> {
		try {
			if (type === CreatioType.ReqestType.login) {
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
		let response: any = await retryAsync(() => this.post(this.getRequestUrl(CreatioType.ReqestType.login), data), ConfigurationHelper.getRetryPolicy());

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
		let response = await this.executeCreatioCommand(CreatioType.ReqestType.login, postData);
		if (response) {
			CreatioStatusBar.update('Connected to Creatio');
			return true;
		} else {
			return false;
		}
	}

	async getCurrentUserInfo() {
		try {
			return await this.sendApiRequest(this.getRequestUrl(CreatioType.ReqestType.getCurrentUserInfo));
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getApplicationInfo() {
		try {
			return await this.sendApiRequest(this.getRequestUrl(CreatioType.ReqestType.getApplicationInfo));
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async revertElements(schemas: Array<CreatioType.WorkSpaceItem>): Promise<CreatioType.CreatioResponse> {
		let response = await this.trySendApiRequest<CreatioType.CreatioResponse>(this.getRequestUrl(CreatioType.ReqestType.revertElements), schemas);
		return response.body;
	}

	async getPackages(): Promise<Array<CreatioType.PackageMetaInfo>> {
		let response = await this.trySendApiRequest<CreatioType.GetPackagesResponse>(this.getRequestUrl(CreatioType.ReqestType.getPackages));
		return response ? response.body.packages.map((x: any) => { return x; }) : [];
	}

	async unlockSchema(items: CreatioType.WorkSpaceItem[]): Promise<CreatioType.CreatioResponse> {
		let response = await this.trySendApiRequest<CreatioType.CreatioResponse>(this.getRequestUrl(CreatioType.ReqestType.unlockPackageElements), items);
		return response.body;
	}

	async lockSchema(items: CreatioType.WorkSpaceItem[]): Promise<CreatioType.CreatioResponse> {
		let response = await this.trySendApiRequest<CreatioType.CreatioResponse>(this.getRequestUrl(CreatioType.ReqestType.lockPackageElements), items);
		return response.body;
	}

	async generateChanges(packageName: string): Promise<CreatioType.PackageChangeEntry | null> {
		const payload = {
			"packageName": packageName
		};
		let response = await this.trySendApiRequest<CreatioType.GenerateChangesResponse>(this.getRequestUrl(CreatioType.ReqestType.generateChanges), payload);
		return response.body.changes.length > 0 ? response.body.changes[0] : null;
	}

	isJSON(text: string): any {
		try {
			JSON.parse(text);
		} catch (e) {
			return false;
		}
		return true;
	}

	async trySendApiRequest<ResponseType extends CreatioType.CreatioResponse>(path: string, postData: any = null): Promise<CreatioType.ClientPostResponse<ResponseType>> {
		if (!this.cookies || this.cookies.length === 0 || this.isConnected() === false) {
			await this.login();
		}

		let response = await retryAsync(() => this.sendApiRequest(path, postData), ConfigurationHelper.getRetryPolicy());

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

		return response as CreatioType.ClientPostResponse<ResponseType>;
	}

	async getWorkspaceItems(): Promise<Array<CreatioType.WorkSpaceItem>> {
		let response = await this.trySendApiRequest<CreatioType.GetWorkspaceItemsResponse>('/0/ServiceModel/WorkspaceExplorerService.svc/GetWorkspaceItems');
		return response ? response.body.items : [];
	}

	async selectQuery(sql: string): Promise<any> {
		const payload = {
			"script": sql
		};
		let response = await this.trySendApiRequest<CreatioType.CreatioResponse>('/0/DataService/json/SyncReply/SelectQuery', payload);
		return response?.body;
	}

	async getSchema(schemaUId: string, type: CreatioType.SchemaType): Promise<CreatioType.Schema | undefined> {
		const payload = {
			"schemaUId": schemaUId
		};

		let response: any;
		let svcPath = "";

		switch (type) {
			case CreatioType.SchemaType.clientUnit:
				svcPath = '/0/ServiceModel/ClientUnitSchemaDesignerService.svc/GetSchema';
				break;
			case CreatioType.SchemaType.sourceCode:
				svcPath = '/0/ServiceModel/SourceCodeSchemaDesignerService.svc/GetSchema';
				break;
			case CreatioType.SchemaType.sqlScript:
				svcPath = '/0/ServiceModel/SqlScriptSchemaDesignerService.svc/GetSchema';
				break;
			case CreatioType.SchemaType.processUserTask:
				svcPath = '/0/ServiceModel/ProcessUserTaskSchemaDesignerService.svc/GetSchema';
				break;
			case CreatioType.SchemaType.entity:
				svcPath = '/0/ServiceModel/EntitySchemaDesignerService.svc/GetSchema';
				break;
			case CreatioType.SchemaType.data:
				svcPath = '/0/ServiceModel/SchemaDataDesignerService.svc/GetSchema';
				break;
			default:
				return undefined; //throw new Error("Invalid schema type");
		}

		response = await this.trySendApiRequest<CreatioType.GetSchemaResponse>(svcPath, payload);
		return response.body.schema;
	}

	async build(): Promise<CreatioType.BuildResponse> {
		let response = await this.trySendApiRequest<CreatioType.BuildResponse>(this.getRequestUrl(CreatioType.ReqestType.build));
		return response.body;
	}

	async rebuild(): Promise<CreatioType.BuildResponse> {
		let response = await this.trySendApiRequest<CreatioType.BuildResponse>(this.getRequestUrl(CreatioType.ReqestType.rebuild));
		return response.body;
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

	async saveSchema(schema: CreatioType.Schema): Promise<CreatioType.SaveSchemaResponse | null> {
		let requestType: CreatioType.ReqestType;
		switch (schema.schemaType) {
			case CreatioType.SchemaType.clientUnit:
				requestType = CreatioType.ReqestType.saveSchemaClientUnit;
				break;
			case CreatioType.SchemaType.sourceCode:
				requestType = CreatioType.ReqestType.saveSchemaSourceCode;
				break;
			default:
				requestType = CreatioType.ReqestType.saveSchemaSourceCode;
				break;
		}

		return await this.executeCreatioCommand<CreatioType.SaveSchemaResponse>(requestType, schema);
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