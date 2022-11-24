var vscode = acquireVsCodeApi();
function postVscMessage(message) {
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

function validateLogin() {
    let url = document.getElementById('url').value;
    let username = document.getElementById('login').value;
    let password = document.getElementById('password').value;
    return url && username && password && url.length > 0 && username.length > 0 && password.length > 0;
}

window.onload = async function () {
    let loginData = await postVscMessage({
        command: 'getLoginData'
    });

    if (loginData) {
        document.getElementById('url').value = loginData.url;
        document.getElementById('login').value = loginData.login;
        document.getElementById('password').value = loginData.password;
    }

    document.getElementById('connect').onclick = function () {
        if (validateLogin()) {
            postVscMessage({
                command: 'login',
                connectionInfo: {
                    url: document.getElementById('url').value,
                    login: document.getElementById('login').value,
                    password: document.getElementById('password').value
                }
            });
        }
    };

    document.getElementById('reload').onclick = function () {
        if (validateLogin()) {
            postVscMessage({
                command: 'reload',
            });
        }
    };
};