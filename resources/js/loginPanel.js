function validateLogin() {
    let url = document.getElementById('url').value;
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;
    return url && username && password && url.length > 0 && username.length > 0 && password.length > 0;
}

window.onload = function () {
    const vscode = acquireVsCodeApi();
    let loginData = vscode.postMessage({
        command: 'getLoginData'
    });

    if (loginData) {
        document.getElementById('url').value = loginData.url;
        document.getElementById('username').value = loginData.username;
        document.getElementById('password').value = loginData.password;
    }

    document.getElementById('confirm').onclick = function () {
        if (validateLogin()) {
            vscode.postMessage({
                command: 'login',
                connectionInfo: {
                    url: document.getElementById('url').value,
                    username: document.getElementById('username').value,
                    password: document.getElementById('password').value
                }
            });
        }
    };
};