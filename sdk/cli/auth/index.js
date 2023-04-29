#!/usr/bin/env node

import {
	accountAuthService,
	accountDatabaseService,
	emailRegex,
	envService,
	localStorageService,
	proto,
	util
} from '../../index.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import prompt from '../modules/prompt.js';

const {AccountLicenseKey, BinaryProto, StringProto} = proto;
const {deserialize, request, safeStringCompare, serialize, uuid} = util;

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
	const {email, name, pin, pinConfirm} = await prompt.get([
		prompts.name,
		prompts.email,
		prompts.pinSet,
		prompts.pinSetConfirm
	]);

	if (!safeStringCompare(pin, pinConfirm)) {
		throw new Error('Unlock passwords do not match. Please try again.');
	}

	const success = await accountAuthService.register(
		crypto.randomBytes(32).toString('hex'),
		uuid(true, false),
		uuid(true, false),
		{
			isCustom: true,
			value: pin
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

	await generateLicenseKey();
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
