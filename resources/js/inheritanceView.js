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
    DOMSelector.select(divs[0]);
    for (let i = 0; i < divs.length; i++) {
        divs[i].addEventListener('click', function () {
            DOMSelector.select(divs[i]);
            let message = {
                id: divs[i].id
            };
            vscode.postMessage(message);
        });
    }
};