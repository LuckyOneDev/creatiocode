import * as http from 'http';

export enum ReqestType {
	getCurrentUserInfo,
	getApplicationInfo,
	getPackages,
	getWorkspaceItems,
	revertElements,
	getPackageState,
	getSchemaMetaData,
	saveSchema,
	getAvailableReferenceSchemas,
	login,
	selectQuery,
	insertQuery,
	deleteQuery,
	updateQuery,
	runProcess,
	processSchemaRequest,
	processSchemaParameter,
	runtimeEntitySchemaRequest,
	entitySchemaManagerRequest,
	restartApp,
	clearRedisDb,
	executeSqlScript,
	pingWebHost,
	pingWebApp,
	getPackageProperties,
	getClientUnitSchema,
	getSqlSchema,
	setFeatureState,
	startLogBroadcast,
	stopLogBroadcast
}

export interface ErrorInfo {
	errorCode: any;
	message: any;
	stackTrace: any;
}

export enum SchemaType {
	sqlScript = 0,
	data = 1,
	dll = 2,
	entity = 3,
	clientUnit = 4,
	sourceCode = 5,
	process = 6,
	case = 7,
	processUserTask = 8,
	unknown = -1,
}

export interface PackageMetaInfo {
	createdBy: string;
	createdOn: string;
	description: string;
	id: string;
	isReadOnly: boolean;
	maintainer: string;
	modifiedBy: string;
	modifiedOn: string;
	name: string;
	position: number;
	type: number;
	uId: string;
	version: string;
}

export interface CreatioResponse {
	errorInfo: null | ErrorInfo;
	success: boolean;
}

export interface GetPackagesResponse extends CreatioResponse {
	packages: Array<WorkSpaceItem>;
}

export interface GetWorkspaceItemsResponse extends CreatioResponse {
	items: Array<WorkSpaceItem>;
}

export interface GetSchemaResponse extends CreatioResponse {
	schema: Schema;
}

export interface SaveSchemaResponse extends CreatioResponse {
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
	parent: Schema | undefined;
}

export interface WorkSpaceItem {
	id: string;
	uId: string;
	isChanged: boolean;
	isLocked: boolean;
	isReadOnly: boolean;
	modifiedOn: Date;
	name: string;
	packageName: string;
	packageRepository: string | undefined;
	packageUId: string;
	title: string | undefined;
	type: SchemaType;
}

export class ClientPostResponse<ResponseType extends CreatioResponse> {
	body: ResponseType;
	response: http.IncomingMessage;
	constructor(body: any, response: http.IncomingMessage) {
		this.body = body;
		this.response = response;
	}
}