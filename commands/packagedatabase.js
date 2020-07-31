#!/usr/bin/env node

const childProcess = require('child_process');
const fs = require('fs');
const glob = require('glob/sync');
const os = require('os');
const {updateRepos} = require('./updaterepos');

const repoPath = `${os.homedir()}/.cyph/repos/cdn`;

const options = {cwd: repoPath};

const packageDatabase = () => {
	updateRepos();

	return glob('**/pkg.gz', options)
		.map(pkg => [
			pkg
				.split('/')
				.slice(0, -1)
				.join('/'),
			childProcess
				.spawnSync('gunzip', ['-c', pkg], options)
				.stdout.toString()
				.trim(),
			parseFloat(
				childProcess
					.spawnSync(
						'gunzip',
						['-c', pkg.slice(0, -6) + 'current.gz'],
						options
					)
					.stdout.toString()
			) || 0
		])
		.reduce(
			(packages, [packageName, root, timestamp]) => ({
				...packages,
				[packageName]: {
					package: {
						root,
						subresources: glob(`${packageName}/**/*.ipfs`, options)
							.map(ipfs => [
								ipfs.slice(packageName.length + 1, -5),
								childProcess
									.spawnSync('cat', [ipfs], options)
									.stdout.toString()
									.trim()
							])
							.reduce(
								(subresources, [subresource, hash]) => ({
									...subresources,
									[subresource]: hash
								}),
								{}
							)
					},
					timestamp
				}
			}),
			{}
		);
};

if (require.main === module) {
	if (process.argv[2]) {
		fs.writeFileSync(process.argv[2], JSON.stringify(packageDatabase()));
	}
	else {
		console.log(JSON.stringify(packageDatabase()));
	}
}
else {
	module.exports = {packageDatabase};
}
