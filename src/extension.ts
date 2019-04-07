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
	const statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	context.subscriptions.push(
		vscode.commands.registerCommand('extension.scan', (uri: vscode.Uri) => {
			let scanStatus: string = 'Scan is complete';
			const selectedSource = uri.fsPath;
			(async () => {
				serverURL = await showInputBox('Enter cx server URL', serverURL, false).then(input => {
					return input ? input : '';
				});
				userName = await showInputBox('Enter user name', userName, false).then(input => {
					return input ? input : '';
				});

				userPass = await showInputBox(`Enter user's password`, userPass, true).then(input => {
					return input ? input : '';
				});
				const projectName = await showInputBox(`Enter project name`, path.basename(selectedSource), false).then(input => {
					return input ? input : '';
				});

				let client = new Client(new URL(`${serverURL}`));
				try {
					await client.login(`${userName}`, `${userPass}`);
					const projectId: number = await client.createProject('CxServer', `${projectName}`, true);
					await client.uploadSourceCode(projectId, selectedSource, `${projectName}` + projectId);
					let scanId = await client.createNewScan(projectId, false, true, true, 'Scan from VSCode');
					displayScanStatus(client, scanId);
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

async function displayScanStatus(client: Client, scanId: number) {
	const statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.show();
	let status;
	do {
		status = await client.getScanStatus(scanId);
		statusBarItem.text = `Scan status: ${status.name}...`;
	} while (status.name !== 'Finished' && status.name !== 'Failed');
	statusBarItem.hide();
}

function showInputBox(question: string, defaultValue: string, isObscure: boolean): Thenable<string | undefined> {
	const inputBoxOptions = {
		prompt: question,
		value: defaultValue,
		password: isObscure
	};
	return vscode.window.showInputBox(inputBoxOptions);
}

// this method is called when your extension is deactivated
export function deactivate() {}
