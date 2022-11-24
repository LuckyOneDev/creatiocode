const vscode = acquireVsCodeApi();
function postVscMessage(message) {
    return new Promise((resolve, reject) => {    
        window.addEventListener('message', (event) => {
            resolve(event.data);
        });
        setTimeout(() => {
            resolve(null);
        }, 1000);
        vscode.postMessage(message);
    });
}

class DOMSelector {
    static selected = undefined;
    static select(div) {
        if (this.selected) this.selected.className = '';
        this.selected = div;
        this.selected.className = 'selected';
    }
}

window.onload = async function () {
    let divs = document.getElementsByTagName('div');
    let currentSchema = await postVscMessage({
        command: 'getCurrentSchema'
    });
    DOMSelector.select(document.getElementById(currentSchema));
    for (let i = 0; i < divs.length; i++) {
        divs[i].addEventListener('click', async function () {
            DOMSelector.select(divs[i]); 
            await postVscMessage({
                command: 'openSchema',
                id: divs[i].id
            });
        });
    }
};