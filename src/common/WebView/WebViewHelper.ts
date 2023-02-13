export class WebviewHelper {
    static createTableString(tableData: Array<Array<string>>): string {
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
}