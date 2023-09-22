#!/usr/bin/env node

import {
	account,
	accountAuthService,
	accountDatabaseService,
	accountUserLookupService,
	configService,
	emailRegex,
	envService,
	localStorageService,
	proto,
	util
} from '../../index.js';
import blessed from 'blessed';
import childProcess from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import xkcdPassphrase from 'xkcd-passphrase';
import {getMeta} from '../modules/base.js';
import prompt from '../modules/prompt.js';

const {__dirname} = getMeta(import.meta);

const {usernameRegex} = account;
const {AccountLicenseKey, BinaryProto, StringProto} = proto;
const {deserialize, request, resolvable, safeStringCompare, serialize, uuid} =
	util;

const licenseKeyPath = path.join(os.homedir(), '.cyphkey');

const prompts = {
	email: {
		description: 'Email Address',
		name: 'email',
		pattern: emailRegex,
		required: true
	},
	masterKey: {
		description: 'Paper Master Key',
		hidden: true,
		name: 'masterKey',
		replace: '*',
		required: true
	},
	masterKeyConfirm: {
		description: 'Confirm Paper Master Key',
		hidden: true,
		name: 'masterKeyConfirm',
		replace: '*',
		required: true
	},
	masterKeyStrength: {
		default:
			configService.masterKey.sizes[configService.masterKey.defaultSize],
		description:
			'Paper Master Key Strength (bits of entropy; enter 0 for custom)',
		name: 'masterKeyStrength',
		type: 'number'
	},
	name: {
		description: 'Name',
		name: 'name',
		required: true
	},
	pinGet: {
		description: 'Unlock Password',
		hidden: true,
		name: 'pin',
		replace: '*',
		required: true
	},
	pinSet: {
		conform: value => value.length >= 4,
		description: 'Unlock Password (4+ characters)',
		hidden: true,
		name: 'pin',
		replace: '*',
		required: true
	},
	pinSetConfirm: {
		description: 'Retype Unlock Password',
		hidden: true,
		name: 'pinConfirm',
		replace: '*',
		required: true
	},
	username: {
		description: 'Username',
		name: 'username',
		pattern: usernameRegex,
		required: true
	}
};

const generateLicenseKey = async () => {
	const licenseKeyData = {
		masterKey: await localStorageService.getItem(
			'masterKey',
			BinaryProto,
			undefined,
			true
		),
		username: await localStorageService.getItem(
			'username',
			StringProto,
			undefined,
			true
		)
	};

	const licenseKey = Buffer.from(
		await serialize(AccountLicenseKey, licenseKeyData)
	).toString('hex');

	await fs.writeFile(licenseKeyPath, licenseKey, {mode: 0o600});

	console.log(`\n\nYour license key is saved at ${licenseKeyPath}.`);
};

export const _showMasterKey = async (masterKey, retry = false) => {
	const resolver = resolvable();

	const baseOptions = {
		align: 'center',
		height: '50%',
		left: 'center',
		style: {
			bg: 'black',
			fg: '#00f900'
		},
		top: 'center',
		width: '50%'
	};

	const screen = blessed.screen({
		smartCSR: true,
		title: 'Cyph Master Key'
	});

	const box = blessed.box({
		...baseOptions,
		border: {
			type: 'line'
		},
		content:
			(retry ? 'Confirmation failure, please try again. ' : '') +
			'Your paper master key is:',
		style: {
			...baseOptions.style,
			border: {
				fg: '#f0f0f0'
			}
		}
	});

	box.append(
		blessed.box({
			...baseOptions,
			content: masterKey,
			style: {
				...baseOptions.style,
				bold: true,
				fg: 'white'
			},
			valign: 'middle'
		})
	);

	box.append(
		blessed.box({
			...baseOptions,
			bottom: 0,
			content:
				'Write this down and/or save it somewhere secure, then press enter.',
			height: '25%',
			left: 0,
			top: undefined,
			valign: 'bottom',
			width: '100%-2'
		})
	);

	screen.append(box);

	screen.key(['enter'], () => {
		screen.destroy();
		resolver.resolve();
	});

	screen.render();

	await resolver;
};

const showMasterKey = async (masterKey, retry = false) => {
	childProcess.spawnSync(
		'node',
		['show-master-key.js', masterKey, retry ? '--retry' : ''],
		{
			cwd: __dirname,
			stdio: 'inherit'
		}
	);
};

export const login = async (username, masterKey) => {
	const loginMethods = [
		async () => {
			if (typeof username !== 'string') {
				return false;
			}
			if (typeof masterKey !== 'string') {
				masterKey = (await prompt.get([prompts.masterKey])).masterKey;
			}
			return accountAuthService.login(username, masterKey);
		},
		async () =>
			useLicenseKey()
				.then(() => true)
				.catch(() => false),
		async () => {
			if (typeof username !== 'string') {
				username = (await prompt.get([prompts.username])).username;
			}
			if (typeof masterKey !== 'string') {
				masterKey = (await prompt.get([prompts.masterKey])).masterKey;
			}
			return accountAuthService.login(username, masterKey);
		}
	];

	for (const loginMethod of loginMethods) {
		const success = await loginMethod();
		if (success) {
			return;
		}
	}

	throw new Error('Login failed.');
};

export const persistentLogin = async () => {
	const {masterKey, username} = await prompt.get([
		prompts.username,
		prompts.masterKey
	]);

	const success = await accountAuthService.login(username, masterKey);

	if (!success) {
		throw new Error('Login failed.');
	}

	await generateLicenseKey();
};

export const register = async () => {
	const {email, name} = await prompt.get([prompts.name, prompts.email]);

	let username;
	while (true) {
		username = (await prompt.get([prompts.username])).username;
		if (
			(await accountUserLookupService.isUsernameAvailable(username))
				.available
		) {
			break;
		}
		console.error(`Username @${username} is not available.`);
	}

	let masterKeyStrength;
	while (
		isNaN(masterKeyStrength) ||
		(masterKeyStrength < 8 && masterKeyStrength !== 0)
	) {
		masterKeyStrength = (await prompt.get([prompts.masterKeyStrength]))
			.masterKeyStrength;
	}

	const masterKey =
		masterKeyStrength === 0 ?
			/* Custom master key */
			await (async () => {
				while (true) {
					console.log('');

					const {masterKey: mk} = await prompt.get([
							prompts.masterKey
						]);
					if (mk.length < configService.masterKey.customMinLength) {
						console.error(
							`Master key must be at least ${configService.masterKey.customMinLength.toString()} characters long.`
						);
						continue;
					}

					const {masterKeyConfirm: mkConfirm} = await prompt.get([
							prompts.masterKeyConfirm
						]);
					if (!safeStringCompare(mk, mkConfirm)) {
						console.error('Master key mismatch, please try again.');
						continue;
					}

					return mk;
				}
			})() :
			/* Generated master key */
			await (async () => {
				const mk = await xkcdPassphrase.generate(masterKeyStrength);

				let mkConfirm;
				while (!safeStringCompare(mk, mkConfirm)) {
					await showMasterKey(mk, typeof mkConfirm === 'string');
					mkConfirm = (await prompt.get([prompts.masterKeyConfirm]))
							.masterKeyConfirm;
				}

				return mk;
			})();

	const success = await accountAuthService.register(
		username,
		masterKey,
		masterKey,
		{
			isCustom: true,
			value: masterKey
		},
		name.trim(),
		email.trim().toLowerCase(),
		await request({
			url: `${envService.baseUrl}invitecode/${accountDatabaseService.namespace}`
		})
	);

	if (!success) {
		throw new Error('Registration failed.');
	}

	await accountDatabaseService.callFunction('confirmMasterKey');

	console.log(`\n\n\nCyph user @${username} is now registered!`);
};

export const useLicenseKey = async () => {
	const licenseKey = await fs
		.readFile(licenseKeyPath, 'utf8')
		.catch(() => {});

	if (typeof licenseKey !== 'string') {
		throw new Error(
			'You must log in, register, or copy an existing license key to ~/.cyphkey.'
		);
	}

	if (((await fs.stat(licenseKeyPath)).mode & 0o777) !== 0o600) {
		throw new Error(
			'Please change ~/.cyphkey permissions to 600 and try again.'
		);
	}

	const {masterKey, username} = await deserialize(
		AccountLicenseKey,
		Buffer.from(licenseKey, 'hex')
	);

	const {pin} = await prompt.get([prompts.pinGet]);

	const success = await accountAuthService.login(username, masterKey, pin);

	if (!success) {
		throw new Error('Login failed.');
	}
};
