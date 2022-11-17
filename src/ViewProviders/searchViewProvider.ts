import { CreatioWebViewProvider } from "./common/creatioWebViewProvider";

export class SearchViewProvider extends CreatioWebViewProvider {
    styles = ['loader.css', 'searchView.css'];

    protected getBody(): string {
        let body = `${this.getSearchBar()} ${this.getSearchResults()}`;
        return body;
    }

    getSearchResults() {
        return ``;
    }

    getSearchBar() {
        return `
        <div class="search-bar">
            <input type="text" id="search-input" placeholder="Search...">
        </div>
        `;
    }
}