import { WorkSpaceItem } from '../api/creatioTypes';
import { File } from './fs/fileSystemProvider';
import { WorkspaceItemViewProvider } from './common/workspaceItemViewProvider';

export class SchemaMetaDataViewProvider extends WorkspaceItemViewProvider {
  styles = ['schemaMetaDataView.css'];

  protected getBody(): string {
    if (!this.currentFile) {
      return 'Schema not selected';
    }
    return this.generateTable(this.currentFile);
  }

  createTableString(tableData: Array<Array<string>>): string {
    var result = "<table>";
    for (var i = 0; i < tableData.length; i++) {
      result += "<tr>";
      for (var j = 0; j < tableData[i].length; j++) {
        result += "<td>" + tableData[i][j] + "</td>";
      }
      result += "</tr>";
    }
    result += "</table>";
    return result;
  }

  generateTable(file: File): string {
    let tableData: any = [];
    for (const [key, value] of Object.entries(file.workSpaceItem)) {
      tableData.push([key, value]);
    }
    return this.createTableString(tableData);
  }
}