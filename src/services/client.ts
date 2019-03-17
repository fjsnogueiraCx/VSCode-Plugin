import { URL } from 'url';
import * as fs from 'fs';
const path = require('path');
const JSZip = require('jszip');
const request = require('superagent');

export class Client {
	private serverURL: URL;
	private accessToken: String;

	constructor(host: URL) {
		this.serverURL = host;
		this.accessToken = '';
	}

	//TODO: parameters like user/password should be passed to the constructor
	public async login(user: string, pass: string) {
		return await request
			.post(`${this.serverURL}/CxRestAPI/auth/identity/connect/token`)
			.set('Content-Type', 'application/x-www-form-urlencoded')
			.send({
				userName: `${user}`,
				password: `${pass}`,
				grant_type: 'password',
				scope: 'sast_rest_api offline_access',
				client_id: 'resource_owner_client',
				client_secret: ``
			})
			.then(
				(response: any) => {
					console.log('Login was successful');
					this.accessToken = response.body.access_token;
				},
				(response: any) => {
					throw Error('Login failed');
				}
			);
	}

	//TODO: add getTeamByName
	public async createProject(owningTeam: string, projectName: string, isPublic: boolean): Promise<number> {
		if (this.accessToken === '') {
			throw Error('Must login first');
		}

		return request
			.post(`${this.serverURL}/CxRestAPI/projects`)
			.set('Content-Type', 'application/json' + ';v=1.0')
			.set('Authorization', `Bearer ${this.accessToken}`)
			.send({
				name: `${projectName}`,
				owningTeam: 1,
				isPublic: isPublic
			})
			.then(
				(response: any) => {
					console.log('Project created successfully');
					return JSON.parse(response.text).id;
				},
				async (reject: any) => {
					try {
						if (reject.response.body.messageDetails === 'Project name already exists') {
							let projectData = await this.getProject(projectName, 1);
							return JSON.parse(projectData)[0].id;
						}
						throw Error('Failed creating project');
					} catch (e) {
						console.log(e);
					}
				}
			);
	}

	public async uploadSourceCode(projectId: number, pathToSource: string): Promise<any> {
		if (this.accessToken === '') {
			throw Error('Must login first');
		}
		let compressedSource = await this.zipSource(pathToSource, 'out');
		return request
			.post(`${this.serverURL}/CxRestAPI/projects/${projectId}/sourceCode/attachments`)
			.set('Authorization', `Bearer ${this.accessToken}`)
			.accept('application/json')
			.field('id', projectId)
			.attach('zippedSource', compressedSource)
			.then(
				(response: any) => {
					console.log(response);
				},
				(rejected: any) => {
					throw new Error(`addScanToProject error: ${rejected}`);
				}
			);
	}

	private async zipSource(path: string, fileName: string) {
		let jszip = new JSZip();
		let stat: fs.Stats = fs.statSync(path);
		let zip = stat.isDirectory ? jszip.folder(path) : jszip.file(path);

		console.log(`Compressing ${path}`);
		return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
		// .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
		// .pipe(fs.createWriteStream(`${fileName}.zip`))
		// .on('finish', () => {
		// 	console.log('out.zip written.');
		// })
		// .on('error', (e: Error) => {
		// 	console.log(`error compressing file: ${e.message}`);
		// });
	}

	public async getProject(projectName: string, teamId: number): Promise<string> {
		if (this.accessToken === '') {
			throw Error('Must login first');
		}
		let projectData: string;
		return request
			.get(`${this.serverURL}/CxRestAPI/projects?projectName=${projectName}&teamId=${teamId}`)
			.set('Content-Type', 'application/json' + ';v=1.0')
			.set('Authorization', `Bearer ${this.accessToken}`)
			.then(
				(response: any) => {
					projectData = response.text;
					return projectData;
				},
				(rejected: any) => {
					throw new Error(`getProject error: ${rejected}`);
				}
			);
	}

	public async createNewScan(
		projectId: number,
		isIncremental: boolean,
		isPublic: boolean,
		isForcedScan: boolean,
		scanComment: string
	) {
		if (this.accessToken === '') {
			throw Error('Must login first');
		}

		let response;
		try {
			response = await request
				.post(`${this.serverURL}/CxRestAPI/sast/scans`)
				.set('Content-Type', 'application/json' + ';v=1.0')
				.set('Authorization', `Bearer ${this.accessToken}`)
				.send({
					projectId: projectId,
					isIncremental: isIncremental,
					isPublic: isPublic,
					forceScan: isForcedScan,
					comment: scanComment
				});
		} catch (err) {
			console.log(`Failed creating new scan error`);
			throw Error(err);
		}
		return response.body.id;
	}
}
