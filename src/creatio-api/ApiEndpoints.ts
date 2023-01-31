import { SchemaType } from "./CreatioTypeDefinitions";

/* eslint-disable @typescript-eslint/naming-convention */
export enum ReqestType {
    GetCurrentUserInfo,
    GetApplicationInfo,
    GetPackages,
    GetWorkspaceItems,
    RevertElements,
    GetPackageState,
    GetSchemaMetaData,
    GetAvailableReferenceSchemas,
    Login,
    SelectQuery,
    InsertQuery,
    DeleteQuery,
    UpdateQuery,
    RunProcess,
    ProcessSchemaRequest,
    ProcessSchemaParameter,
    RuntimeEntitySchemaRequest,
    EntitySchemaManagerRequest,
    RestartApp,
    ClearRedisDb,
    ExecuteSqlScript,
    PingWebHost,
    PingWebApp,
    GetPackageProperties,
    GetClientUnitSchema,
    GetSqlSchema,
    SetFeatureState,
    StartLogBroadcast,
    StopLogBroadcast,
    UnlockPackageElements,
    LockPackageElements,
    GenerateChanges,
    Build,
    Rebuild,
    ClientUnitSchemaDesignerService
};

export type EnumDictionary<T extends string | symbol | number, U> = {
    [K in T]: U;
};

export enum DesignerReqestType {
    GetSchema,
    SaveSchema,
}

export const DesignerServiceMethods: EnumDictionary<DesignerReqestType, string> = 
{
    [DesignerReqestType.GetSchema]: 'GetSchema',
    [DesignerReqestType.SaveSchema]: 'SaveSchema'
};

export const DesignerServiceEndpoints: EnumDictionary<SchemaType, string> = {
    [SchemaType.sqlScript]: '/0/ServiceModel/SqlScriptSchemaDesignerService.svc/', 
    [SchemaType.entity]: '/0/ServiceModel/EntitySchemaDesignerService.svc/',
    [SchemaType.clientUnit]: '/0/ServiceModel/ClientUnitSchemaDesignerService.svc/',
    [SchemaType.sourceCode]: '/0/ServiceModel/SourceCodeSchemaDesignerService.svc/',
    [SchemaType.processUserTask]: '/0/ServiceModel/ProcessUserTaskSchemaDesignerService.svc/',

    [SchemaType.process]: '',
    [SchemaType.data]: '',
    [SchemaType.case]: '',
    [SchemaType.dll]: '',
    "-1": ""
};

export const Endpoints: EnumDictionary<ReqestType, string> =
{
    [ReqestType.GetCurrentUserInfo]: '/0/ServiceModel/UserInfoService.svc/GetCurrentUserInfo',
    [ReqestType.GetApplicationInfo]: '/0/ServiceModel/ApplicationInfoService.svc/GetApplicationInfo',
    [ReqestType.GetPackages]: '/0/ServiceModel/PackageService.svc/GetPackages',
    [ReqestType.GetWorkspaceItems]: '/0/ServiceModel/WorkspaceExplorerService.svc/GetWorkspaceItems',
    [ReqestType.RevertElements]: '/0/ServiceModel/SourceControlService.svc/RevertElements',
    [ReqestType.GetPackageState]: '/0/ServiceModel/SourceControlService.svc/GetPackageState',
    [ReqestType.GetSchemaMetaData]: '/0/ServiceModel/SchemaMetaDataService.svc/GetSchemaMetaData',
    [ReqestType.ClientUnitSchemaDesignerService]: '/0/ServiceModel/ClientUnitSchemaDesignerService.svc/',
    [ReqestType.GetAvailableReferenceSchemas]: '/0/ServiceModel/EntitySchemaDesignerService.svc/GetAvailableReferenceSchemas',
    [ReqestType.Login]: '/ServiceModel/AuthService.svc/Login',
    [ReqestType.SelectQuery]: '/DataService/json/SyncReply/SelectQuery',
    [ReqestType.InsertQuery]: '/DataService/json/SyncReply/InsertQuery',
    [ReqestType.DeleteQuery]: '/DataService/json/SyncReply/DeleteQuery',
    [ReqestType.UpdateQuery]: '/DataService/json/SyncReply/UpdateQuery',
    [ReqestType.RunProcess]: '/0/ServiceModel/ProcessEngineService.svc/RunProcess',
    [ReqestType.ProcessSchemaRequest]: '/0/ServiceModel/ProcessSchemaRequestService.svc/ProcessSchemaRequest',
    [ReqestType.ProcessSchemaParameter]: '/0/DataService/json/SyncReply/ProcessSchemaParameter',
    [ReqestType.RuntimeEntitySchemaRequest]: '/0/DataService/json/SyncReply/RuntimeEntitySchemaRequest',
    [ReqestType.EntitySchemaManagerRequest]: '/0/DataService/json/SyncReply/EntitySchemaManagerRequest',
    [ReqestType.RestartApp]: '/0/ServiceModel/AppInstallerService.svc/RestartApp',
    [ReqestType.ClearRedisDb]: '/0/ServiceModel/AppInstallerService.svc/ClearRedisDb',
    [ReqestType.ExecuteSqlScript]: '/0/rest/CreatioApiGateway/ExecuteSqlScript',
    [ReqestType.PingWebHost]: '/0/api/HealthCheck/Ping',
    [ReqestType.PingWebApp]: '/api/HealthCheck/Ping',
    [ReqestType.GetPackageProperties]: '/0/ServiceModel/PackageService.svc/GetPackageProperties',
    [ReqestType.GetClientUnitSchema]: '/0/ServiceModel/ClientUnitSchemaDesignerService.svc/GetSchema',
    [ReqestType.GetSqlSchema]: '/0/ServiceModel/SqlScriptSchemaDesignerService.svc/GetSchema',
    [ReqestType.SetFeatureState]: '/0/rest/FeatureStateService/SetFeatureState',
    [ReqestType.StartLogBroadcast]: '/0/rest/ATFLogService/StartLogBroadcast',
    [ReqestType.StopLogBroadcast]: '/0/rest/ATFLogService/ResetConfiguration',
    [ReqestType.UnlockPackageElements]: '/0/ServiceModel/SourceControlService.svc/UnlockPackageElements',
    [ReqestType.LockPackageElements]: '/0/ServiceModel/SourceControlService.svc/LockPackageElements',
    [ReqestType.GenerateChanges]: '/0/ServiceModel/SourceControlService.svc/GenerateChanges',
    [ReqestType.Build]: '/0/ServiceModel/WorkspaceExplorerService.svc/Build',
    [ReqestType.Rebuild]: '/0/ServiceModel/WorkspaceExplorerService.svc/Rebuild',
};