#!/usr/bin/env node

import {util} from '@cyph/sdk';
import childProcess from 'child_process';
import fs from 'fs';
import glob from 'glob/sync.js';
import memoize from 'lodash-es/memoize.js';
import os from 'os';
import path from 'path';
import {updateRepos} from './update-repos.js';

const {dynamicDeserialize, dynamicSerializeBytes} = util;

const cachePath = `${os.homedir()}/.package-database`;
const repoPath = `${os.homedir()}/.cyph/repos/cdn`;

const options = {cwd: repoPath};
const globOptions = {cwd: repoPath, symlinks: true};

const clientMaximumAllowedLatency = 5000;
const clientMinimumSupportedMbps = 0.5;
const serverMaximumAllowedLatency = 2500;
const serverMinimumSupportedMbps = 1;

const getFiles = memoize(pattern => glob(pattern, globOptions));

const getSubresourceTimeouts = (
	packageName,
	maximumAllowedLatency,
	minimumSupportedMbps
) =>
	getFiles(`${packageName}/**/*.ipfs`)
		.map(ipfs => `${ipfs.slice(0, -5)}.br`)
		.map(br => [
			br.slice(packageName.length + 1, -3),
			Math.round(
				(fs.statSync(path.join(repoPath, br)).size /
					((1024 * 1024) / 8) /
					minimumSupportedMbps) *
					1000 +
					maximumAllowedLatency
			)
		])
		.reduce(
			(subresources, [subresource, timeout]) => ({
				...subresources,
				[subresource]: timeout
			}),
			{}
		);

export const getPackageDatabase = memoize(async () => {
	if (fs.existsSync(cachePath)) {
		return dynamicDeserialize(fs.readFileSync(cachePath));
	}

	await updateRepos();

	const packageDatabase = getFiles('**/pkg.gz')
		.map(pkg => [
			pkg.split('/').slice(0, -1).join('/'),
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
					packageV1: {
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
						subresourceTimeouts: getSubresourceTimeouts(
							packageName,
							clientMaximumAllowedLatency,
							clientMinimumSupportedMbps
						)
					},
					packageV2: fs.existsSync(`${packageName}/pkg.v2.br`) ?
						fs.readFileSync(`${packageName}/pkg.v2.br`) :
						undefined,
					timestamp,
					uptime: Array.from(
						Object.entries(
							getSubresourceTimeouts(
								packageName,
								serverMaximumAllowedLatency,
								serverMinimumSupportedMbps
							)
						)
					).map(([subresource, timeout]) => ({
						expectedResponseSize: fs.readFileSync(
							path.join(
								repoPath,
								packageName,
								`${subresource}.br`
							)
						).length,
						ipfsHash: fs
							.readFileSync(
								path.join(
									repoPath,
									packageName,
									`${subresource}.ipfs`
								)
							)
							.toString()
							.trim(),
						timeout
					}))
				}
			}),
			{}
		);

	fs.writeFileSync(cachePath, dynamicSerializeBytes(packageDatabase));

	return packageDatabase;
});