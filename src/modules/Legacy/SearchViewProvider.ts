import { GenericWebViewProvider } from "../../common/WebView/GenericWebViewProvider";

export class SearchViewProvider extends GenericWebViewProvider {
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