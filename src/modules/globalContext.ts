import * as vscode from 'vscode';
import { CreatioExplorer } from './FileSystem/CreatioExplorer';
import { CreatioFileSystemProvider } from './FileSystem/CreatioFileSystemProvider';
import { FileSystemHelper } from './FileSystem/FileSystemHelper';
import { SchemaMetaDataViewProvider } from "./Legacy/SchemaMetaDataViewProvider";
import { InheritanceViewProvider } from './RelatedFiles/InheritanceViewProvider';

/**
 * Used to access and register global extension objects.
 */
export class CreatioCodeContext {
    static extensionContext: vscode.ExtensionContext;
    static metadataProvider = new SchemaMetaDataViewProvider();
    static fsProvider = new CreatioFileSystemProvider();
    static fsHelper = new FileSystemHelper();
    static inheritanceProvider = new InheritanceViewProvider();
    static explorer = new CreatioExplorer();
}