import {Injectable} from '@angular/core';
import {SecurityModels} from '../account';
import {BaseProvider} from '../base-provider';
import {StringProto} from '../proto';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {PotassiumService} from '../services/crypto/potassium.service';

/**
 * Angular service for account email.
 */
@Injectable()
export class AccountEmailService extends BaseProvider {
	/** @ignore */
	private getAdditionalData (username: string) : string {
		return `${username}:publicEmailData`;
	}

	/** Generates signature for publication. */
	public async generateSignature (email: string) : Promise<Uint8Array> {
		const currentUser = await this.accountDatabaseService.getCurrentUser();

		return this.potassiumService.sign.signDetached(
			email,
			currentUser.keys.signingKeyPair.privateKey,
			this.getAdditionalData(currentUser.user.username)
		);
	}

	/** Gets email data. */
	public async getEmailData (query: {
		email?: string;
		username?: string;
	}) : Promise<{email: string; username: string}> {
		const {
			email,
			signature,
			username
		}: {email: unknown; signature: unknown; username: unknown} =
			(await this.accountDatabaseService.callFunction(
				'getEmailData',
				query
			)) || {};

		if (
			!(
				typeof email === 'string' &&
				signature instanceof Uint8Array &&
				typeof username === 'string' &&
				(!query.email || query.email === email) &&
				(!query.username || query.username === username)
			)
		) {
			throw new Error('Email data not found.');
		}

		const valid = await this.potassiumService.sign.verifyDetached(
			signature,
			email,
			(
				await this.accountDatabaseService.getUserPublicKeys(username)
			).signing,
			this.getAdditionalData(username)
		);

		if (!valid) {
			throw new Error('Invalid signature.');
		}

		return {email, username};
	}

	/** Publishes email data. */
	public async publishEmailData (unpublish: boolean = false) : Promise<void> {
		const email = await this.accountDatabaseService.getItem(
			'emailVerified',
			StringProto,
			SecurityModels.unprotected
		);

		if (!email) {
			throw new Error('Verified email not set.');
		}

		await this.accountDatabaseService.callFunction('publishEmail', {
			signature: await this.generateSignature(email),
			unpublish
		});
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();
	}
}
