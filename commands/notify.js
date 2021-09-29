#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import fs from 'fs';
import os from 'os';
import {initDatabaseService} from '../modules/database-service.js';

const namespace = 'cyph.ws';
const projectId = 'cyphme';

const {sendMessage} = initDatabaseService(projectId);

const username = (
	await fs.promises
		.readFile(os.homedir() + '/.cyph/notify.username')
		.catch(() => '')
)
	.toString()
	.trim();

const adminUsernames = (
	await fs.promises
		.readFile(os.homedir() + '/.cyph/notify.admins')
		.catch(() => '')
)
	.toString()
	.trim()
	.split('\n')
	.filter(s => s);

const options = {
	actions: [{callback: 'noop', title: `Local Environment: @${username}`}]
};

export const notify = async (message, notifyAllAdmins = false) =>
	!notifyAllAdmins ?
		sendMessage(namespace, username, message, options) :
		Promise.all(
			adminUsernames.map(async adminUsername =>
				sendMessage(namespace, adminUsername, message, options)
			)
		);

if (isCLI) {
	(async () => {
		const notifyAllAdmins = process.argv[2] === '--admins';
		const message = process.argv.slice(!notifyAllAdmins ? 2 : 3).join(' ');

		await notify(message, notifyAllAdmins);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
