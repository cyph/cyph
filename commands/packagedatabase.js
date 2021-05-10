#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import childProcess from 'child_process';
import fs from 'fs';
import glob from 'glob/sync.js';
import memoize from 'lodash-es/memoize.js';
import os from 'os';
import path from 'path';
import {updateRepos} from './updaterepos.js';

const repoPath = `${os.homedir()}/.cyph/repos/cdn`;

const options = {cwd: repoPath};
const globOptions = {cwd: repoPath, symlinks: true};

const minimumSupportedMbps = 0.5;

const getFiles = memoize(pattern => glob(pattern, globOptions));

export const packageDatabase = () => {
	updateRepos();

	return getFiles('**/pkg.gz')
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
			) || 0,
			fs.existsSync(path.join(repoPath, pkg.slice(0, -6) + 'pkg.ipfs')) ?
				{
					integrityHash: fs
						.readFileSync(
							path.join(repoPath, pkg.slice(0, -6) + 'pkg.br')
						)
						.toString('hex'),
					ipfsHash: fs
						.readFileSync(
							path.join(repoPath, pkg.slice(0, -6) + 'pkg.ipfs')
						)
						.toString()
						.trim()
				} :
				{}
		])
		.reduce(
			(packages, [packageName, root, timestamp, uptime]) => ({
				...packages,
				[packageName]: {
					package: {
						root,
						subresources: getFiles(`${packageName}/**/*.ipfs`)
							.map(ipfs => [
								ipfs.slice(packageName.length + 1, -5),
								fs
									.readFileSync(path.join(repoPath, ipfs))
									.toString()
									.trim()
							])
							.reduce(
								(subresources, [subresource, hash]) => ({
									...subresources,
									[subresource]: hash
								}),
								{}
							),
						subresourceTimeouts: getFiles(
							`${packageName}/**/*.ipfs`
						)
							.map(ipfs => `${ipfs.slice(0, -5)}.br`)
							.map(br => [
								br.slice(packageName.length + 1, -3),
								Math.round(
									(fs.statSync(path.join(repoPath, br)).size /
										((1024 * 1024) / 8) /
										minimumSupportedMbps) *
										1000 +
										5000
								)
							])
							.reduce(
								(subresources, [subresource, timeout]) => ({
									...subresources,
									[subresource]: timeout
								}),
								{}
							)
					},
					timestamp,
					uptime
				}
			}),
			{}
		);
};

if (isCLI) {
	if (process.argv[2]) {
		fs.writeFileSync(process.argv[2], JSON.stringify(packageDatabase()));
	}
	else {
		console.log(JSON.stringify(packageDatabase()));
	}

	process.exit(0);
}
