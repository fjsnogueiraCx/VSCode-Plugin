import * as fs from 'fs';
const archiver = require('archiver');

export interface ZipFile {
	fullPath: string;
	name: string;
	data: string;
	content_type: string;
}

export interface ZipFileContainer {
	zipFile: ZipFile;
	newDirPath: string;
}

export default class Zipper {
	constructor() {}
	public zipDirectory(dirPath: string, fileName: string): Promise<ZipFile> {
		console.log('Archiver:: Zipping directory ' + dirPath);

		const zipFile: ZipFile = {
			fullPath: __dirname + `${fileName}.zip`,
			name: `${fileName}.zip`,
			data: '',
			content_type: 'application/zip'
		};

		return new Promise<any>((fulfill, reject) => {
			const zipOutput = fs.createWriteStream(zipFile.fullPath);
			const archive = archiver('zip', { zlib: { level: 9 } });

			archive.on('warning', function(err: any) {
				if (err.code === 'ENOENT') {
					console.log(err);
				} else {
					// throw error
					throw err;
				}
			});

			archive.on('error', function(err: any) {
				throw err;
			});
			zipOutput.on('close', function() {
				console.log('Archiver:: INFO ' + archive.pointer() + ' total bytes');
				console.log('Archiver:: INFO Archiver has been finalized and the output file descriptor has closed.');
				fs.readFile(zipFile.fullPath, 'base64', function(err, data) {
					if (err) {
						console.log('Archiver:: ZipFile fs.readFile ERROR ' + err);
						reject(zipFile);
					} else {
						zipFile.data = data;
						fulfill(zipFile);
					}
				});
			});

			archive.on('error', function(err: any) {
				console.log('Archiver:: ERROR ' + err);
				reject(zipFile);
			});

			archive.pipe(zipOutput);

			archive.directory(dirPath, false);

			archive.finalize();
		}).catch(err => {
			console.log('Archiver:: zipDirectory() ERROR ' + err);
		});
	}
}
