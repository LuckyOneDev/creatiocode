import * as vscode from 'vscode';

export class CreatioStatusBar {
    // Singleton
    private static statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

    private constructor() {
        CreatioStatusBar.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    }
    private static instance: CreatioStatusBar;
    public static getInstance(): CreatioStatusBar {
        if (!CreatioStatusBar.instance) {
            CreatioStatusBar.instance = new CreatioStatusBar();
        }
        return CreatioStatusBar.instance;
    }

    public static animate(text: string) {
        this.update(text + '\t\$(sync~spin)');
    }

    public static update(text: string) {
        CreatioStatusBar.statusBar.text = text;
    }

    public static show(text: string) {
        this.statusBar.text = text;
        this.statusBar.show();
    }

    public static hide() {
        this.statusBar.hide();
    }
}