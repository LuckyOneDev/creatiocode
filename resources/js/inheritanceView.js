class DOMSelector {
    static selected = undefined;
    static select(div) {
        if (this.selected) this.selected.className = '';
        this.selected = div;
        this.selected.className = 'selected';
    }
  }

window.onload = function () {
    const vscode = acquireVsCodeApi();
    let divs = document.getElementsByTagName('div');
    let currentSchema = vscode.postMessage({
        command: 'getCurrentSchema'
    });
    DOMSelector.select(document.getElementById(currentSchema));
    for (let i = 0; i < divs.length; i++) {
        divs[i].addEventListener('click', function () {
            DOMSelector.select(divs[i]);
            vscode.postMessage({
                command: 'openSchema',
                id: divs[i].id
            });
        });
    }
};