
import * as VScode from 'vscode';


export class MainView implements VScode.TreeDataProvider<any> {
    onDidChangeTreeData?: VScode.Event<any> | undefined;
    getTreeItem(element: any): VScode.TreeItem | Thenable<VScode.TreeItem> {
        throw new Error("Method not implemented.");
    }
    getChildren(element?: any): VScode.ProviderResult<any[]> {
        throw new Error("Method not implemented.");
    }

}