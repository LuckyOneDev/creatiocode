var vscode = acquireVsCodeApi();
function postVSCMessage(message) {
    return new Promise((resolve, reject) => {
        window.addEventListener('message', (event) => {
            resolve(event.data);
        });
        setTimeout(() => {
            resolve(null);
        }, 1000, { once: true });
        vscode.postMessage(message);
    });
}

function createTable(tableData) {
    var table = document.createElement('table');
    var tableBody = document.createElement('tbody');

    tableData.forEach(function (rowData) {
        var row = document.createElement('tr');

        rowData.forEach(function (cellData) {
            var cell = document.createElement('td');
            cell.appendChild(document.createTextNode(cellData));
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });

    table.appendChild(tableBody);
    return table;
}


function parseToArr(arr) {
    let tableData = [];
    let rowData = [];

    for (const key of Object.keys(arr[0])) {
        rowData.push(key);
    }

    tableData.push(rowData);

    arr.forEach(element => {
        rowData = [];
        for (const entry of Object.values(element)) {
            rowData.push(entry);
        }
        tableData.push(rowData);
    });

    return tableData;
}

function createControls() {
    let holder = document.createElement('div');
    let commentField = document.createElement('textarea');
    commentField.cols = 40;
    commentField.rows = 5;
    commentField.id = "comment";
    commentField.placeholder = "Commit comments...";
    commentField.className = "commentField";

    let commitButton = document.createElement('button');
    commitButton.innerHTML = "Commit";
    commitButton.className = "commitButton";
    
    commitButton.onclick = async () => {
        await postVSCMessage({
            command: 'commit',
            message: document.getElementById("comment").value
        });
    };

    holder.appendChild(commentField);
    holder.appendChild(commitButton);
    holder.className = "inputPanel";
    return holder;
}

window.onload = async function () {
    let changes = await postVSCMessage({
        command: 'getChanges'
    });

    // Prepare table
    let elements = parseToArr(changes.items);
    let head = elements[0];
    head = [head[0], head[1], head[5]];
    elements.splice(0, 1);
    elements = elements.sort((a) => a[1] === 1 ? -1 : 1).map(x => [x[0], x[2], x[5]]);
    elements.unshift(head);

    document.body.appendChild(createTable(elements));
    document.body.appendChild(createControls());
};