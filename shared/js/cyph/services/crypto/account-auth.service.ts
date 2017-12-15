import {Injectable} from '@angular/core';
import {skip} from 'rxjs/operators/skip';
import {take} from 'rxjs/operators/take';
import {Subscription} from 'rxjs/Subscription';
import {ExternalServices} from '../../account';
import {
	AccountLoginData,
	AccountUserPresence,
	AccountUserProfile,
	AccountUserTypes,
	AGSEPKICSR,
	BinaryProto,
	BooleanProto,
	IAccountLoginData,
	IKeyPair,
	KeyPair,
	StringProto
} from '../../proto';
import {normalize} from '../../util/formatting';
import {deserialize, serialize} from '../../util/serialization';
import {uuid} from '../../util/uuid';
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
	private statusSaveSubscription?: Subscription;

	/** @ignore */
	private async getKeyPair (url: string, symmetricKey: Uint8Array) : Promise<IKeyPair> {
		return deserialize(
			KeyPair,
			await this.potassiumService.secretBox.open(
				await this.databaseService.getItem(url, BinaryProto),
				symmetricKey
			)
		);
	}

	/** @ignore */
	private async passwordHash (username: string, password: string) : Promise<Uint8Array> {
		username	= normalize(username);

		return (
			await this.potassiumService.passwordHash.hash(
				password,
				username + '9BdfYbI5PggWwtnaAXbDRIsTHgMjLx/8hbHvgbQb+qs='
			)
		).hash;
	}

	/** Indicates whether credentials are saved locally. */
	public async hasSavedCredentials () : Promise<boolean> {
		return (
			await Promise.all(['masterKey', 'pinIsCustom', 'username'].map(async k =>
				this.localStorageService.hasItem(k)
			))
		).filter(b => !b).length < 1;
	}

	/**
	 * Logs in.
	 * @returns Whether login was successful.
	 */
	public async login (
		username: string,
		masterKey: string|Uint8Array,
		pin?: string
	) : Promise<boolean> {
		await this.logout(false);

		if (!username || !masterKey) {
			return false;
		}

		try {
			username	= normalize(username);

			if (typeof masterKey === 'string') {
				masterKey	= await this.passwordHash(username, masterKey);
			}
			else if (typeof pin === 'string') {
				masterKey	= await this.potassiumService.secretBox.open(
					masterKey,
					await this.passwordHash(username, pin)
				);
			}

			const user		= await this.accountUserLookupService.getUser(username);

			if (!user) {
				throw new Error('Non-existent user.');
			}

			const loginData	= await deserialize(
				AccountLoginData,
				await this.potassiumService.secretBox.open(
					await this.databaseService.getItem(`users/${username}/loginData`, BinaryProto),
					masterKey
				)
			);

			await this.databaseService.login(username, loginData.secondaryPassword);

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
				`users/${username}/clientConnections/${uuid()}`,
				async () => {
					try {
						user.accountUserPresence.setValue(
							await this.accountDatabaseService.getItem(
								'lastPresence',
								AccountUserPresence
							)
						);
					}
					catch {}
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
			catch {}

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

			await Promise.all([
				this.localStorageService.setItem(
					'masterKey',
					BinaryProto,
					/* Locally encrypt master key with PIN */
					await this.potassiumService.secretBox.seal(
						masterKey,
						await this.accountDatabaseService.getItem('pin/hash', BinaryProto)
					)
				),
				this.localStorageService.setItem(
					'pinIsCustom',
					BinaryProto,
					await this.accountDatabaseService.getItem('pin/isCustom', BinaryProto)
				),
				this.localStorageService.setItem(
					'username',
					StringProto,
					await user.realUsername.pipe(take(1)).toPromise()
				)
			]);
		}
		catch {
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
			await this.localStorageService.removeItem('masterKey');
			await this.localStorageService.removeItem('pinIsCustom');
			await this.localStorageService.removeItem('username');
		}

		this.accountDatabaseService.currentUser.next(undefined);
		return this.databaseService.logout();
	}

	/** Registers. */
	public async register (
		realUsername: string,
		masterKey: string,
		pin: {isCustom: boolean; value: string},
		name: string,
		email?: string,
		inviteCode?: string
	) : Promise<boolean> {
		if (!realUsername || !masterKey) {
			return false;
		}

		const username	= normalize(realUsername);

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

		try {
			const [
				encryptionKeyPair,
				signingKeyPair,
				certificateRequestURL,
				publicEncryptionKeyURL,
				publicProfileURL
			]	= await Promise.all([
				this.potassiumService.box.keyPair(),
				this.potassiumService.sign.keyPair(),
				this.accountDatabaseService.normalizeURL(`users/${username}/certificateRequest`),
				this.accountDatabaseService.normalizeURL(`users/${username}/publicEncryptionKey`),
				this.accountDatabaseService.normalizeURL(`users/${username}/publicProfile`),
				this.databaseService.register(username, loginData.secondaryPassword)
			]);

			if (inviteCode) {
				await this.databaseService.removeItem(
					`users/${username}/inviterUsernamePlaintext`
				);

				await this.databaseService.setItem(
					`users/${username}/inviteCode`,
					StringProto,
					inviteCode
				);

				const inviterUsername	= await this.databaseService.getAsyncValue(
					`users/${username}/inviterUsernamePlaintext`,
					StringProto,
					undefined,
					true
				).getValue();

				if (!inviterUsername) {
					throw new Error('Invalid invite code.');
				}

				await this.databaseService.setItem(
					`users/${username}/inviterUsername`,
					BinaryProto,
					await this.potassiumService.secretBox.seal(
						await serialize(StringProto, inviterUsername),
						loginData.symmetricKey
					)
				);
			}

			await Promise.all([
				this.databaseService.setItem(
					`users/${username}/loginData`,
					BinaryProto,
					await this.potassiumService.secretBox.seal(
						await serialize(AccountLoginData, loginData),
						await this.passwordHash(username, masterKey)
					)
				),
				this.databaseService.setItem(
					publicProfileURL,
					BinaryProto,
					await this.potassiumService.sign.sign(
						await serialize(AccountUserProfile, {
							description: this.stringsService.defaultDescription,
							externalUsernames,
							hasPremium: false,
							name,
							realUsername,
							userType: AccountUserTypes.Standard
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
						await serialize(
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
						await serialize(KeyPair, encryptionKeyPair),
						loginData.symmetricKey
					)
				),
				this.databaseService.setItem(
					`users/${username}/signingKeyPair`,
					BinaryProto,
					await this.potassiumService.secretBox.seal(
						await serialize(KeyPair, signingKeyPair),
						loginData.symmetricKey
					)
				),
				this.databaseService.setItem(
					certificateRequestURL,
					BinaryProto,
					await this.potassiumService.sign.sign(
						await serialize(AGSEPKICSR, {
							publicSigningKey: signingKeyPair.publicKey,
							username
						}),
						signingKeyPair.privateKey,
						certificateRequestURL
					)
				),
				this.databaseService.setItem(
					`users/${username}/pin/hash`,
					BinaryProto,
					await this.potassiumService.secretBox.seal(
						await this.passwordHash(username, pin.value),
						loginData.symmetricKey
					)
				),
				this.databaseService.setItem(
					`users/${username}/pin/isCustom`,
					BinaryProto,
					await this.potassiumService.secretBox.seal(
						await serialize(BooleanProto, pin.isCustom),
						loginData.symmetricKey
					)
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
		catch {
			await this.databaseService.unregister(username, loginData.secondaryPassword).catch(
				() => {}
			);

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
	) {}
}
