/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as http from 'http';

export class ErrorInfo {
	errorCode: any;
	message: any;
	stackTrace: any;
}

export enum SchemaType {
	SqlScript = 0,
	Data = 1,
	Dll = 2,
	Entity = 3,
	ClientUnit = 4,
	SourceCode = 5,
	Process = 6,
	Case = 7,
	ProcessUserTask = 8,
	Unknown = -1,
}

export class PackageMetaInfo {
	createdBy: string = "";
	createdOn: string = "";
	description: string = "";
	id: string = "";
	isReadOnly: boolean = true;
	maintainer: string = "";
	modifiedBy: string = "";
	modifiedOn: string = "";
	name: string = "";
	position: number = 0;
	type: number = 0;
	uId: string = "";
	version: string = "";
}

interface CreatioResponse {
	errorInfo: null | ErrorInfo;
	success: boolean;
}

interface GetPackagesResponse extends CreatioResponse {
	packages: Array<SchemaMetaInfo>;
}

interface GetWorkspaceItemsResponse extends CreatioResponse {
	items: Array<SchemaMetaInfo>;
}

interface GetSchemaResponse extends CreatioResponse {
	schema: Schema;
}

interface SaveSchemaResponse extends CreatioResponse {
	buildResult: Number;
	errorInfo: null | any;
	errors: null | any;
	message: null | string;
	schemaUid: string;
	success: boolean;
}

export interface Schema {
	uId: string;
	isReadOnly: boolean;
	caption: Array<{ cultureName: string; value: string }>;
	description: Array<any>;
	localizableStrings: Array<{ uId: string, name: string, parentSchemaUId: string }>;
	parameters: Array<any>;
	_markerCommentsTemplate: string;
	messages: Array<any>;
	images: Array<{ uId: string, name: string, parentSchemaUId: string, isChanged: boolean }>;
	name: string;
	body: string;
	dependencies: any;
	id: string;
	package: undefined | PackageMetaInfo;
	extendParent: boolean;
	group: string;
	less: string;
	schemaType: SchemaType;
	parent: undefined | { uId: string, name: string };
}

export class SchemaMetaInfo {
	constructor(data: Partial<SchemaMetaInfo>) {
		Object.assign(this, data);
	}

	id: string = "";
	uId: string = "";
	isChanged: boolean = false;
	isLocked: boolean = false;
	isReadOnly: boolean = false;
	modifiedOn: string = "";
	name: string = "";
	packageName: string = "";
	packageRepository: any;
	packageUId: string = "";
	title: string = "";
	type: SchemaType = SchemaType.Unknown;
}

export class ClientPostResponse<ResponseType extends CreatioResponse> {
	body: ResponseType;
	response: http.IncomingMessage;
	constructor(body: any, response: http.IncomingMessage) {
		this.body = body;
		this.response = response;
	}
}

export class CreatioClient {
	cookies: any;
	credentials: any;

	userAgent: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36";
	connected: boolean = false;

	constructor(credentials: any) {
		this.credentials = credentials;
	}

	sendPost(path: string, postData: any = null): any {
		return new Promise((resolve, reject) => {
			if (postData) { postData = JSON.stringify(postData); }

			var options = {
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
			vscode.window.showInformationMessage('Connected to Creatio');
		} else {
			vscode.window.showErrorMessage('Invalid login or password');
		}
		this.connected = flag;
		return flag;
	}

	async getCurrentUserInfo() {
		try {
			return await this.sendClientPost('/0/ServiceModel/UserInfoService.svc/GetCurrentUserInfo');
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getApplicationInfo() {
		try {
			return await this.sendClientPost('/0/ServiceModel/ApplicationInfoService.svc/GetApplicationInfo');
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
			return err;
		}
	}

	async getPackages(): Promise<Array<PackageMetaInfo>> {
		let response = await this.trySendClientPost<GetPackagesResponse>('/0/ServiceModel/PackageService.svc/GetPackages');
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
		let response = await this.sendClientPost(path, postData);

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

	async getWorkspaceItems(): Promise<Array<SchemaMetaInfo>> {
		let response = await this.trySendClientPost<GetWorkspaceItemsResponse>('/0/ServiceModel/WorkspaceExplorerService.svc/GetWorkspaceItems');
		return response ? response.body.items.map((x: any) => { return new SchemaMetaInfo(x); }) : [];
	}

	async revertElements(schemas: Array<SchemaMetaInfo>): Promise<CreatioResponse | undefined> {
		let response = await this.trySendClientPost<CreatioResponse>('/0/ServiceModel/SourceControlService.svc/RevertElements', schemas);
		return response?.body;
	}

	async getSchema(schemaUId: string, type: SchemaType): Promise<Schema | null> {
		const payload = {
			"schemaUId": schemaUId
		};

		let response: any;
		let svcPath = "";

		switch (type) {
			case SchemaType.ClientUnit:
				svcPath = '/0/ServiceModel/ClientUnitSchemaDesignerService.svc/GetSchema';
				break;
			case SchemaType.SourceCode:
				svcPath = '/0/ServiceModel/SourceCodeSchemaDesignerService.svc/GetSchema';
				break;
			case SchemaType.SqlScript:
				svcPath = '/0/ServiceModel/SqlScriptSchemaDesignerService.svc/GetSchema';
				break;
			case SchemaType.ProcessUserTask:
				svcPath = '/0/ServiceModel/ProcessUserTaskSchemaDesignerService.svc/GetSchema';
				break;
			case SchemaType.Entity:
				svcPath = '/0/ServiceModel/EntitySchemaDesignerService.svc/GetSchema';
				response = await this.trySendClientPost<GetSchemaResponse>(svcPath, payload);
				return response.body.schema;
			case SchemaType.Data:
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