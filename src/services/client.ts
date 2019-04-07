import { URL } from 'url';
import Zipper from './Zipper';
import { StatusBarAlignment } from 'vscode';
const request = require('superagent');

export class Client {
	private serverURL: URL;
	private accessToken: String;
	private zipper: Zipper;

	constructor(host: URL) {
		this.serverURL = host;
		this.accessToken = '';
		this.zipper = new Zipper();
	}

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
				client_secret: `014DF517-39D1-4453-B7B3-9930C563627C`
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

	//TODO: add getTeamByName, uses hard coded team 1 CxServer
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

	public async uploadSourceCode(projectId: number, pathToSource: string, tempFileName: string): Promise<any> {
		if (this.accessToken === '') {
			throw Error('Must login first');
		}

		let compressedSource = await this.zipSource(pathToSource, tempFileName);

		return request
			.post(`${this.serverURL}/CxRestAPI/projects/${projectId}/sourceCode/attachments`)
			.set('Authorization', `Bearer ${this.accessToken}`)
			.accept('application/json')
			.field('id', projectId)
			.attach('zippedSource', compressedSource.fullPath)
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
		let zippedSource = await this.zipper.zipDirectory(path, fileName);
		return zippedSource;
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

	public async getScanStatus(scanId: number) {
		if (this.accessToken === '') {
			throw Error('Must login first');
		}

		let response;
		try {
			response = await request
				.get(`${this.serverURL}/CxRestAPI/sast/scans/${scanId}`)
				.set('Authorization', `Bearer ${this.accessToken}`);
		} catch (err) {
			console.log(`Failed creating new scan error`);
			throw Error(err);
		}

		return response.body.status;
	}

	public generateScanReport(scanId: string, filePath: string): any {
		if (this.accessToken === '') {
			throw Error('Must login first');
		}
		let reportURI;

		(async () => {
			try {
				reportURI = await this.requestReport(scanId, 'pdf');
				this.createReport(reportURI, 'pdf');
			} catch (err) {
				console.log(`Failed Generating report`);
				throw Error(err);
			}
		})();
	}

	private async requestReport(scanId: string, reportType: string) {
		const response = await request
			.post(`${this.serverURL}/CxRestAPI/reports/sastScan/`)
			.set('Authorization', `Bearer ${this.accessToken}`)
			.send({
				reportType: reportType,
				scanId: scanId
			});

		return response.body.links.report.uri;
	}

	private async createReport(reportURI: string, reportType: string) {
		let isReportReady = await this.reportPolling(1000, reportURI);
		if (!isReportReady) {
			throw Error('Report was not ready within time limits');
		}
		request
			.get(`${this.serverURL}` + reportURI)
			.set('Authorization', `Bearer ${this.accessToken}`)
			.then((response: any) => {
				return response.body;
			});
	}

	//TODO: should also return false on failed status
	private async reportPolling(maxAttempts: number, reportURI: string) {
		let isReportFinish: boolean = false;
		while (maxAttempts > 0 && !isReportFinish) {
			await this.wait(1000);
			await request
				.get(`${this.serverURL}` + reportURI + '/status')
				.set('Authorization', `Bearer ${this.accessToken}`)
				.then((response: any) => {
					if (response.body.status.value === 'Created') {
						isReportFinish = true;
					} else {
						--maxAttempts;
					}
				});
		}
		return isReportFinish;
	}

	private wait(waitMs: number) {
		return new Promise(resolve => setTimeout(resolve, waitMs));
	}
}
