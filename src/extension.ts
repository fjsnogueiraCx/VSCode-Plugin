// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { URL } from 'url';
import { Client } from './services/client';

// const PropertiesReader = require('properties-reader');
const path = require('path');
var serverURL = '';
var userName = '';
var userPass = '';

// this method is called when your extension is activated
// your extension is activated the very *first* time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let client: Client;
	// let properties = PropertiesReader(`/config/properties.ini`);

	// The commandId parameter must match the command field in package.json
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.scan', (uri: vscode.Uri) => {
			let scanStatus: string = 'Scan is now running';
			const selectedSource = uri.fsPath;

			(async () => {
				let res = await showInputBox('Enter cx server URL', serverURL);
				serverURL = res ? res : '';
				res = await showInputBox('Enter user name', userName);
				userName = res ? res : '';
				res = await showInputBox(`Enter user's password`, userPass); //TODO: should use **** as input
				userPass = res ? res : '';
				const projectName = await showInputBox(`Enter project name password`, path.basename(selectedSource));

				let client = new Client(new URL(`${serverURL}`));
				try {
					await client.login(`${userName}`, `${userPass}`);
					const projectId: number = await client.createProject('CxServer', `${projectName}`, true);
					await client.uploadSourceCode(projectId, selectedSource, `${projectName}` + projectId);
					await client.createNewScan(projectId, false, true, true, 'testing, testing 1,2,3');
				} catch (err) {
					scanStatus = err;
					console.log(err);
				}
				// Display a message box to the user
				vscode.window.showInformationMessage(`${scanStatus}`);
			})();
		})
	);
}

function onSuccess() {
	console.log('login was successful');
}

function onError() {
	console.log('login failed');
}

function showInputBox(question: string, defaultValue: string): Thenable<string | undefined> {
	const inputBoxOptions = {
		prompt: question,
		value: defaultValue
	};
	return vscode.window.showInputBox(inputBoxOptions);
}

// this method is called when your extension is deactivated
export function deactivate() {}
