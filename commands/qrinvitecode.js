#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {__dirname, isCLI} = getMeta(import.meta);

import childProcess from 'child_process';
import fs from 'fs';
import {mkdirp} from 'mkdirp';
import {addInviteCode} from './addinvitecode.js';
import {getQR} from './qr.js';

const businessCardBackground = `${__dirname}/../shared/assets/img/business-card-back.png`;
const businessCardInvite = `${__dirname}/../shared/assets/img/business-card-invite.png`;

const qrInviteCodeDir = `${__dirname}/../qr-invite-codes`;
const qrInviteCodeBusinessCardDir = `${__dirname}/../qr-invite-codes/business-cards`;
const qrInviteCodeQRDir = `${__dirname}/../qr-invite-codes/qrs`;
const qrInviteCodeURLDir = `${__dirname}/../qr-invite-codes/urls`;

export const qrInviteCode = async (countByUser, plan) => {
	childProcess.spawnSync('rm', ['-rf', qrInviteCodeDir]);
	await mkdirp(qrInviteCodeBusinessCardDir);
	await mkdirp(qrInviteCodeQRDir);
	await mkdirp(qrInviteCodeURLDir);

	const inviteCodes = Object.values(
		await addInviteCode('cyphme', countByUser, undefined, plan)
	)[0];

	for (let i = 0; i < inviteCodes.length; ++i) {
		const url = `https://cyph.app/register/${inviteCodes[i]}`;

		const businessCardPath = `${qrInviteCodeBusinessCardDir}/${i}.png`;
		const qrPath = `${qrInviteCodeQRDir}/${i}.png`;
		const qrTmpPath = `${qrInviteCodeQRDir}/.${i}.tmp.png`;
		const urlPath = `${qrInviteCodeURLDir}/${i}.txt`;

		fs.writeFileSync(urlPath, url);
		await getQR(url, qrPath);

		childProcess.spawnSync('convert', [
			qrPath,
			'-resize',
			'675x675',
			qrTmpPath
		]);
		childProcess.spawnSync('convert', [
			'-background',
			'transparent',
			'-fill',
			'rgba(255, 255, 255, 0.66)',
			'-font',
			'Helvetica-Bold',
			'-pointsize',
			'48',
			`label:${url}`,
			businessCardPath
		]);
		childProcess.spawnSync('composite', [
			'-gravity',
			'center',
			'-geometry',
			'+0+590',
			businessCardPath,
			businessCardBackground,
			businessCardPath
		]);
		childProcess.spawnSync('composite', [
			'-geometry',
			'+956+290',
			qrTmpPath,
			businessCardPath,
			businessCardPath
		]);
		childProcess.spawnSync('composite', [
			'-geometry',
			'+444+96',
			businessCardInvite,
			businessCardPath,
			businessCardPath
		]);

		fs.unlinkSync(qrTmpPath);
	}
};

if (isCLI) {
	(async () => {
		const count = toInt(process.argv[2]);
		const plan = process.argv[3];
		const inviterUsername = process.argv[4] || '';

		await qrInviteCode({[inviterUsername]: isNaN(count) ? 1 : count}, plan);

		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
