import * as http from 'http';
















export enum ReqestType {
	getCurrentUserInfo,
	getApplicationInfo,
	getPackages,
	getWorkspaceItems,
	revertElements,
	getPackageState,
	getSchemaMetaData,
	saveSchemaClientUnit,
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
	stopLogBroadcast,
	unlockPackageElements,
	lockPackageElements,
	generateChanges,
	build,
	rebuild,
	saveSchemaSourceCode
}

export enum ChangeState {
	unchanged = 0,
	added = 1,
	changed = 2,
}

export interface ErrorInfo {
	errorCode: any;
	message: any;
	stackTrace: any;
}

export enum ChangeStateSchemaType {
	schemaResource = 6,
	schema = 1
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

export interface PackageChangeEntryItem {
	cultureName: string | null;
	name : string;
	state: ChangeState;
	stateCaption: string;
	stateName: string;
	type: number;
	typeCaption: string;
	typeName : string;
	uId: string;
}

export interface PackageChangeEntry {
	items: Array<PackageChangeEntryItem>;
	name : string;
	state: ChangeState;
	stateCaption: string;
	stateName: string;
	type: number;
	typeCaption: string;
	typeName : string;
	uId: string;
}

export interface GenerateChangesResponse extends CreatioResponse {
	changes: Array<PackageChangeEntry>;
	errors: Array<any> | null;
}

export interface BuildResponse extends CreatioResponse {
	buildResult: number;
	message: string;
	errors: Array<any> | null;
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
	parent: Partial<Schema>;
}

export function isSchema(object: any): object is Schema {
    return 'uId' in object 
		&& 'name' in object
		&& 'schemaType' in object
		&& 'body' in object
		&& 'isReadOnly' in object
		&& 'parent' in object;
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

export function isWorkspaceItem(object: any): object is WorkSpaceItem {
    return 'uId' in object 
		&& 'name' in object
		&& 'type' in object
		&& 'packageName' in object
		&& 'packageUId' in object;
}

export class ClientPostResponse<ResponseType extends CreatioResponse> {
	body: ResponseType;
	response: http.IncomingMessage;
	constructor(body: any, response: http.IncomingMessage) {
		this.body = body;
		this.response = response;
	}
}