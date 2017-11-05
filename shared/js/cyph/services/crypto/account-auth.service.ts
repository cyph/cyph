import {Injectable} from '@angular/core';
import {skip} from 'rxjs/operators/skip';
import {Subscription} from 'rxjs/Subscription';
import {
	AccountLoginData,
	AccountUserPresence,
	AccountUserProfile,
	AGSEPKICSR,
	IAccountLoginData,
	IKeyPair,
	KeyPair
} from '../../../proto';
import {ExternalServices} from '../../account';
import {BinaryProto, BooleanProto, StringProto} from '../../protos';
import {util} from '../../util';
import {AccountUserLookupService} from '../account-user-lookup.service';
import {DatabaseService} from '../database.service';
import {LocalStorageService} from '../local-storage.service';
import {StringsService} from '../strings.service';
import {AccountDatabaseService} from './account-database.service';
import {PotassiumService} from './potassium.service';


/**
 * Account authentication service.
 */
@Injectable()
export class AccountAuthService {
	/** @ignore */
	private connectTrackerCleanup?: () => void;

	/** @ignore */
	private resolveReady: () => void;

	/** @ignore */
	private statusSaveSubscription?: Subscription;

	/** Resolves when this service is ready for use. */
	public readonly ready: Promise<void>	= new Promise<void>(resolve => {
		this.resolveReady	= resolve;
	});

	/** @ignore */
	private async getKeyPair (url: string, symmetricKey: Uint8Array) : Promise<IKeyPair> {
		return util.deserialize(
			KeyPair,
			await this.potassiumService.secretBox.open(
				await this.databaseService.getItem(url, BinaryProto),
				symmetricKey
			)
		);
	}

	/** @ignore */
	private async passwordHash (username: string, password: string) : Promise<Uint8Array> {
		username	= util.normalize(username);

		return (
			await this.potassiumService.passwordHash.hash(
				password,
				await this.potassiumService.hash.deriveKey(
					username + '9BdfYbI5PggWwtnaAXbDRIsTHgMjLx/8hbHvgbQb+qs=',
					await this.potassiumService.passwordHash.saltBytes
				)
			)
		).hash;
	}

	/**
	 * Logs in.
	 * @returns Whether login was successful.
	 */
	public async login (username: string, password: string|Uint8Array) : Promise<boolean> {
		await this.logout(false);

		if (!username || !password) {
			return false;
		}

		try {
			username	= util.normalize(username);

			if (typeof password === 'string') {
				password	= await this.passwordHash(username, password);
			}

			const user		= await this.accountUserLookupService.getUser(username);

			const loginData	= await util.deserialize(
				AccountLoginData,
				await this.potassiumService.secretBox.open(
					await this.databaseService.getItem(`users/${username}/loginData`, BinaryProto),
					password
				)
			);

			await this.databaseService.login(username, loginData.secondaryPassword);
			await this.localStorageService.setItem('username', StringProto, username);
			await this.localStorageService.setItem('password', BinaryProto, password);

			const signingKeyPair	= await this.getKeyPair(
				`users/${username}/signingKeyPair`,
				loginData.symmetricKey
			);

			if (!this.potassiumService.compareMemory(
				signingKeyPair.publicKey,
				(await this.accountDatabaseService.getUserPublicKeys(username)).signing
			)) {
				throw new Error('Invalid certificate.');
			}

			this.accountDatabaseService.currentUser.next({
				keys: {
					encryptionKeyPair: await this.getKeyPair(
						`users/${username}/encryptionKeyPair`,
						loginData.symmetricKey
					),
					signingKeyPair,
					symmetricKey: loginData.symmetricKey
				},
				user
			});

			this.connectTrackerCleanup	= await this.databaseService.setConnectTracker(
				`users/${username}/clientConnections/${util.uuid()}`,
				async () => {
					try {
						user.accountUserPresence.setValue(
							await this.accountDatabaseService.getItem(
								'lastPresence',
								AccountUserPresence
							)
						);
					}
					catch (_) {}
				}
			);

			try {
				if (
					(await user.accountUserPresence.getValue()).status ===
					AccountUserPresence.Statuses.Offline
				) {
					await user.accountUserPresence.setValue(
						await this.accountDatabaseService.getItem(
							'lastPresence',
							AccountUserPresence
						)
					);
				}
			}
			catch (_) {}

			this.statusSaveSubscription	= this.databaseService.watch(
				`users/${username}/presence`,
				AccountUserPresence
			).pipe(skip(1)).subscribe(({timestamp, value}) => {
				if (isNaN(timestamp)) {
					return;
				}

				this.accountDatabaseService.setItem(
					'lastPresence',
					AccountUserPresence,
					value
				);
			});
		}
		catch (_) {
			return false;
		}

		return true;
	}

	/** Logs out. */
	public async logout (clearSavedCredentials: boolean = true) : Promise<void> {
		const user	= this.accountDatabaseService.currentUser.value;

		if (this.statusSaveSubscription) {
			this.statusSaveSubscription.unsubscribe();
		}
		if (this.connectTrackerCleanup) {
			this.connectTrackerCleanup();
			this.connectTrackerCleanup	= undefined;
		}
		if (user) {
			this.potassiumService.clearMemory(user.keys.symmetricKey);
			this.potassiumService.clearMemory(user.keys.encryptionKeyPair.privateKey);
			this.potassiumService.clearMemory(user.keys.signingKeyPair.privateKey);
			this.potassiumService.clearMemory(user.keys.encryptionKeyPair.publicKey);
			this.potassiumService.clearMemory(user.keys.signingKeyPair.publicKey);
		}
		if (clearSavedCredentials) {
			await this.localStorageService.removeItem('password');
			await this.localStorageService.removeItem('username');
		}

		this.accountDatabaseService.currentUser.next(undefined);
		return this.databaseService.logout();
	}

	/** Registers. */
	public async register (
		realUsername: string,
		password: string,
		pin: {isCustom: boolean; value: string},
		name: string,
		email?: string
	) : Promise<boolean> {
		if (!realUsername || !password) {
			return false;
		}

		try {
			const username	= util.normalize(realUsername);

			const externalUsernames: {[s: string]: string}	= {};
			if (email) {
				externalUsernames[ExternalServices.email]	= email;
			}

			const loginData: IAccountLoginData	= {
				secondaryPassword: this.potassiumService.toBase64(
					this.potassiumService.randomBytes(64)
				),
				symmetricKey: this.potassiumService.randomBytes(
					await this.potassiumService.secretBox.keyBytes
				)
			};

			const [
				encryptionKeyPair,
				signingKeyPair,
				certificateRequestURL,
				pinHashURL,
				pinIsCustomURL,
				publicEncryptionKeyURL,
				publicProfileURL
			]	= await Promise.all([
				this.potassiumService.box.keyPair(),
				this.potassiumService.sign.keyPair(),
				this.accountDatabaseService.normalizeURL(`users/${username}/certificateRequest`),
				this.accountDatabaseService.normalizeURL(`users/${username}/pin/hash`),
				this.accountDatabaseService.normalizeURL(`users/${username}/pin/isCustom`),
				this.accountDatabaseService.normalizeURL(`users/${username}/publicEncryptionKey`),
				this.accountDatabaseService.normalizeURL(`users/${username}/publicProfile`),
				this.databaseService.register(username, loginData.secondaryPassword)
			]);

			await Promise.all([
				this.databaseService.setItem(
					`users/${username}/loginData`,
					BinaryProto,
					await this.potassiumService.secretBox.seal(
						await util.serialize(AccountLoginData, loginData),
						await this.passwordHash(username, password)
					)
				),
				this.databaseService.setItem(
					publicProfileURL,
					BinaryProto,
					await this.potassiumService.sign.sign(
						await util.serialize(AccountUserProfile, {
							description: this.stringsService.defaultDescription,
							externalUsernames,
							hasPremium: false,
							name,
							realUsername
						}),
						signingKeyPair.privateKey,
						publicProfileURL,
						true
					)
				),
				this.databaseService.setItem(
					`users/${username}/lastPresence`,
					BinaryProto,
					await this.potassiumService.secretBox.seal(
						await util.serialize(
							AccountUserPresence,
							{status: AccountUserPresence.Statuses.Online}
						),
						loginData.symmetricKey
					)
				),
				this.databaseService.setItem(
					`users/${username}/encryptionKeyPair`,
					BinaryProto,
					await this.potassiumService.secretBox.seal(
						await util.serialize(KeyPair, encryptionKeyPair),
						loginData.symmetricKey
					)
				),
				this.databaseService.setItem(
					`users/${username}/signingKeyPair`,
					BinaryProto,
					await this.potassiumService.secretBox.seal(
						await util.serialize(KeyPair, signingKeyPair),
						loginData.symmetricKey
					)
				),
				this.databaseService.setItem(
					certificateRequestURL,
					BinaryProto,
					await this.potassiumService.sign.sign(
						await util.serialize(AGSEPKICSR, {
							publicSigningKey: signingKeyPair.publicKey,
							username
						}),
						signingKeyPair.privateKey,
						certificateRequestURL
					)
				),
				this.databaseService.setItem(
					pinHashURL,
					BinaryProto,
					await this.potassiumService.secretBox.seal(
						await this.passwordHash(username, pin.value),
						loginData.symmetricKey
					)
				),
				this.databaseService.setItem(
					pinIsCustomURL,
					BooleanProto,
					pin.isCustom
				),
				this.databaseService.setItem(
					publicEncryptionKeyURL,
					BinaryProto,
					await this.potassiumService.sign.sign(
						encryptionKeyPair.publicKey,
						signingKeyPair.privateKey,
						publicEncryptionKeyURL,
						true
					)
				)
			]);
		}
		catch (_) {
			return false;
		}

		return true;
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly stringsService: StringsService
	) { (async () => {
		const username	= await this.localStorageService.getItem(
			'username',
			StringProto
		).catch(
			() => {}
		);

		const password	= await this.localStorageService.getItem(
			'password',
			BinaryProto
		).catch(
			() => {}
		);

		if (testEnvironmentSetup) {
			await testEnvironmentSetup(databaseService, localStorageService);
		}

		if (username && password) {
			await this.login(username, password);
		}

		this.resolveReady();
	})(); }
}
