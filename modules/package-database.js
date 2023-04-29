#!/usr/bin/env node

import {util} from '@cyph/sdk';
import childProcess from 'child_process';
import fs from 'fs';
import {globSync as glob} from 'glob';
import memoize from 'lodash-es/memoize.js';
import os from 'os';
import path from 'path';
import {getCDNRepo as getCDNRepoInternal} from './cdn-repo.js';

const {dynamicDeserialize, dynamicSerializeBytes} = util;

const cachePath = path.join(os.tmpdir(), '.package-database');

const clientMaximumAllowedLatency = 5000;
const clientMinimumSupportedMbps = 0.5;
const serverMaximumAllowedLatency = 2500;
const serverMinimumSupportedMbps = 1;

const readIfExists = filePath =>
	fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined;

const getCDNRepo = memoize(getCDNRepoInternal);

const getFiles = memoize((pattern, cdnRepo) =>
	glob(pattern, {cwd: cdnRepo.repoPath, symlinks: true})
);

const getSubresourceTimeouts = (
	packageName,
	maximumAllowedLatency,
	minimumSupportedMbps,
	cdnRepo
) =>
	getFiles(`${packageName}/**/*.ipfs`, cdnRepo)
		.map(ipfs => `${ipfs.slice(0, -5)}.br`)
		.map(br => [
			br.slice(packageName.length + 1, -3),
			Math.round(
				(fs.statSync(path.join(cdnRepo.repoPath, br)).size /
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

const getSubresourcesDataInternal = (packageName, cdnRepo) => ({
	subresources: getFiles(`${packageName}/**/*.ipfs`, cdnRepo)
		.map(ipfs => [
			ipfs.slice(packageName.length + 1, -5),
			fs.readFileSync(path.join(cdnRepo.repoPath, ipfs)).toString().trim()
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
		clientMinimumSupportedMbps,
		cdnRepo
	)
});

export const getSubresourcesData = async packageName =>
	getSubresourcesDataInternal(packageName, await getCDNRepo());

export const getPackageDatabase = memoize(async () => {
	if (fs.existsSync(cachePath)) {
		return dynamicDeserialize(fs.readFileSync(cachePath));
	}

	const cdnRepo = await getCDNRepo();

	const {repoPath} = cdnRepo;
	const options = {cwd: repoPath};

	const packageDatabase = getFiles('**/pkg.gz', cdnRepo)
		.map(pkg => [
			pkg.split('/').slice(0, -1).join('/'),
			fs.existsSync(path.join(repoPath, pkg)) ?
				childProcess
					.spawnSync('gunzip', ['-c', pkg], options)
					.stdout.toString()
					.trim() :
				'',
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
						...getSubresourcesDataInternal(packageName, cdnRepo),
						root
					},
					packageV2: readIfExists(
						`${repoPath}/${packageName}/pkg.v2.br`
					),
					timestamp,
					uptime: Array.from(
						Object.entries(
							getSubresourceTimeouts(
								packageName,
								serverMaximumAllowedLatency,
								serverMinimumSupportedMbps,
								cdnRepo
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
