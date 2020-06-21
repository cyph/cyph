import {Injectable} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {map} from 'rxjs/operators';
import {SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {BooleanProto} from '../proto';
import {toBehaviorSubject} from '../util/flatten-observable';
import {resolvable} from '../util/wait';
import {ConfigService} from './config.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DatabaseService} from './database.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {QRService} from './qr.service';
import {StringsService} from './strings.service';

/**
 * Angular service for managing Accounts invites.
 */
@Injectable()
export class AccountInviteService extends BaseProvider {
	/** @ignore */
	private readonly codes = this.accountDatabaseService.getAsyncMap(
		'inviteCodes',
		BooleanProto,
		SecurityModels.unprotected
	);

	/** Number of available invites. */
	public readonly count = toBehaviorSubject(
		this.codes.watchKeys().pipe(map(arr => arr.length)),
		0
	);

	/** @ignore */
	private async sendInviteInternal (
		email?: string,
		name?: string
	) : Promise<string> {
		const inviteCode = await this.databaseService.callFunction(
			'sendInvite',
			email ? {email, name} : undefined
		);

		if (typeof inviteCode !== 'string') {
			throw new Error('Invite failed');
		}

		return inviteCode;
	}

	/** Deletes an invite URL. */
	public async deleteInvite (
		inviteCode: string | {inviteCode: string}
	) : Promise<void> {
		await this.codes.removeItem(
			typeof inviteCode === 'string' ? inviteCode : inviteCode.inviteCode
		);
	}

	/** Gets an invite URL. */
	public async getInviteURL () : Promise<{
		inviteCode: string;
		qrCode: () => Promise<SafeUrl>;
		url: string;
	}> {
		const inviteCode = await this.sendInviteInternal();

		const url = `${this.envService.appUrl}register/${inviteCode}`;

		return {
			inviteCode,
			qrCode: async () =>
				this.qrService.getQRCode({
					dotScale: 0.75,
					size: 250,
					text: url
				}),
			url
		};
	}

	/** Sends an invite link. */
	public async send (email: string, name?: string) : Promise<void> {
		await this.sendInviteInternal(email, name);
	}

	/** Displays invite link to user. */
	public async showInviteURL () : Promise<void> {
		const {
			plan
		} = await (await this.accountDatabaseService.getCurrentUser()).user.cyphPlan.getValue();

		const hasUnlimitedInvites =
			this.configService.planConfig[plan].initialInvites === undefined;

		if (
			!hasUnlimitedInvites &&
			!(await this.dialogService.confirm({
				content: this.stringsService.inviteLinkConfirm,
				title: this.stringsService.inviteLinkTitle
			}))
		) {
			return;
		}

		const invite = await this.getInviteURL();
		const afterOpened = resolvable();

		const afterClosed = this.dialogService.alert(
			{
				content: this.stringsService.setParameters(
					this.stringsService.inviteLinkText,
					{link: invite.url}
				),
				image: await invite.qrCode(),
				markdown: true,
				title: this.stringsService.inviteLinkTitle
			},
			undefined,
			afterOpened
		);

		if (hasUnlimitedInvites) {
			return afterClosed;
		}

		await afterOpened;
		await this.deleteInvite(invite);
		await afterClosed;
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly qrService: QRService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();
	}
}
