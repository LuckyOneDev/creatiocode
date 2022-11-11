import { Schema } from "../../api/creatioInterfaces";
import { CreatioWebViewProvider } from "../creatioWebViewProvider";

export class SearchViewProvider extends CreatioWebViewProvider {
    protected getStyles(): string {
        return `
        .search-bar {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100px;
            background-color: #f5f5f5;
        }
        .search-bar input {
            width: 100%;
            max-width: 500px;
            height: 40px;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 0 10px;
        }
        `;
    }
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
    protected onDidReceiveMessage(message: any): void {
        return;
    }
    protected getScripts(): string[] {
        return ['./src/ViewProviders/searchView/searchView.js'];
    }
}