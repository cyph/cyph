#!/usr/bin/env node

import {getMeta} from './base.js';
const {__dirname} = getMeta(import.meta);

import childProcess from 'child_process';
import fs from 'fs';
import {mkdirp} from 'mkdirp';
import os from 'os';

const getSubdirectories = dir =>
	fs
		.readdirSync(dir)
		.filter(d => d !== '.git' && fs.lstatSync(`${dir}/${d}`).isDirectory());

export const updateRepos = async () => {
	const repoRoot = `${os.homedir()}/.cyph/repos`;

	if (
		!fs.existsSync(`${__dirname}/../commands/keycache.sh`) ||
		!fs.existsSync(repoRoot)
	) {
		return;
	}

	childProcess.spawnSync('bash', ['./keycache.sh'], {
		cwd: `${__dirname}/../commands`,
		stdio: 'inherit'
	});

	if (fs.existsSync(`${os.homedir()}/.noupdaterepos`)) {
		return;
	}

	for (const repo of ['cdn', 'chat-widget', 'custom-builds', 'internal']) {
		const path = `${repoRoot}/${repo}`;
		const gitIndexLockPath = `${path}/.git/index.lock`;

		if (fs.existsSync(gitIndexLockPath)) {
			fs.unlinkSync(gitIndexLockPath);
		}

		if (fs.existsSync(path)) {
			for (const args of [
				['reset', '--hard'],
				['clean', '-dfx'],
				['fetch', '--all'],
				['pull', '--recurse-submodules'],
				['submodule', 'update']
			]) {
				childProcess.spawnSync('git', args, {
					cwd: path,
					stdio: 'inherit'
				});
			}
		}
		else {
			await mkdirp(path);

			childProcess.spawnSync(
				'git',
				[
					'clone',
					'--recursive',
					`git@github.com:cyph/${repo}.git`,
					path
				],
				{stdio: 'inherit'}
			);
		}
	}

	const internalPath = `${repoRoot}/internal`;

	const customBuilds = new Set(
		getSubdirectories(`${repoRoot}/custom-builds`)
	);

	const cyphBranches = new Set(
		getSubdirectories(`${repoRoot}/cdn`)
			.filter(
				d =>
					d.endsWith('.cyph.app') &&
					d !== 'beta-staging.cyph.app' &&
					d !== 'debug.cyph.app' &&
					d !== 'websign' &&
					d !== 'cyph' &&
					!d.startsWith('staging.') &&
					!d.startsWith('simple-') &&
					!customBuilds.has(d)
			)
			.map(d => d.replace(/\.cyph\.app$/, ''))
			.concat(['prod', 'public'])
	);

	const outdatedBranches = childProcess
		.spawnSync('git', ['branch'], {cwd: internalPath})
		.stdout.toString()
		.trim()
		.split('\n')
		.map(s => s.replace(/^\*/, '').trim())
		.filter(s => !cyphBranches.has(s));

	for (const branch of cyphBranches) {
		for (const args of [
			['checkout', '-b', branch, '--track', `origin/${branch}`],
			['checkout', branch],
			['pull', '--recurse-submodules'],
			['submodule', 'update']
		]) {
			childProcess.spawnSync('git', args, {
				cwd: internalPath,
				stdio: 'inherit'
			});
		}
	}

	for (const branch of outdatedBranches) {
		childProcess.spawnSync('git', ['branch', '-D', branch], {
			cwd: internalPath,
			stdio: 'inherit'
		});
	}
};
