#!/usr/bin/env node


const childProcess	= require('child_process');
const fs			= require('fs');
const mkdirp		= require('mkdirp');
const os			= require('os');


const updateRepos	= () => {
	for (const repo of ['cdn', 'custom-builds']) {
		const path	= `${os.homedir()}/.cyph/repos/${repo}`;

		if (fs.existsSync(path)) {
			for (const args of [
				['reset', '--hard'],
				['clean', '-dfx'],
				['pull', '--recurse-submodules'],
				['submodule', 'update']
			]) {
				childProcess.spawnSync('git', args, {cwd: path, stdio: 'inherit'});
			}
		}
		else {
			mkdirp.sync(path);

			childProcess.spawnSync(
				'git',
				['clone', '--recursive', `git@github.com:cyph/${repo}.git`, path],
				{stdio: 'inherit'}
			);
		}
	}
};


if (require.main === module) {
	updateRepos();
}
else {
	module.exports	= {updateRepos};
}
