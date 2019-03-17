// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { URL } from 'url';
import { Client } from './services/client';
import { MainView } from './views/MainView';

const request = require('superagent');
// this method is called when your extension is activated
// your extension is activated the very *first* time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let client: Client = new Client(new URL('http://localhost'));

	// The commandId parameter must match the command field in package.json
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand

	vscode.window.createInputBox().show();
	vscode.window.registerTreeDataProvider('mainView', new MainView());
	let disposable = vscode.commands.registerCommand('extension.scan', (uri: vscode.Uri) => {
		const selectedSource = uri.fsPath;
		(async () => {
			try {
				await client.login('', '');
				const projectId: number = await client.createProject('CxServer', 'helloFromVsCode', true);
				await client.uploadSourceCode(projectId, selectedSource);
				await client.createNewScan(projectId, false, true, true, 'testing, testing 1,2,3');
			} catch (err) {
				console.log(err);
			}
		})();

		// Display a message box to the user
		vscode.window.showInformationMessage('Running new scan');
	});

	context.subscriptions.push(disposable);
}

function onSuccess() {
	console.log('login was successful');
}

function onError() {
	console.log('login failed');
}
// this method is called when your extension is deactivated
export function deactivate() {}
