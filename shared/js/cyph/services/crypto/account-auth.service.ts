/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import {Subscription} from 'rxjs';
import {skip} from 'rxjs/operators';
import {RegistrationErrorCodes} from '../../account';
import {IProto} from '../../iproto';
import {
	AccountLoginData,
	AccountUserPresence,
	AccountUserProfile,
	AccountUserProfileExtra,
	AccountUserTypes,
	AGSEPKICSR,
	BinaryProto,
	BooleanProto,
	IAccountLoginData,
	KeyPair,
	NumberProto,
	StringProto
} from '../../proto';
import {normalize} from '../../util/formatting';
import {deserialize, serialize} from '../../util/serialization';
import {getTimestamp} from '../../util/time';
import {uuid} from '../../util/uuid';
import {AccountUserLookupService} from '../account-user-lookup.service';
import {DatabaseService} from '../database.service';
import {ErrorService} from '../error.service';
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

	/** Error message. */
	public errorMessage?: string;

	/** @ignore */
	private async getItem <T> (
		url: string,
		proto: IProto<T>,
		key: Uint8Array
	) : Promise<T> {
		return deserialize(
			proto,
			await this.potassiumService.secretBox.open(
				await this.databaseService.getItem(url, BinaryProto),
				key,
				`${this.databaseService.namespace}:${
					await this.accountDatabaseService.normalizeURL(url)
				}`
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

	/** @ignore */
	private async setItem <T> (
		url: string,
		proto: IProto<T>,
		data: T,
		key: Uint8Array,
		isPublic: boolean = false,
		compressed: boolean = false
	) : Promise<void> {
		url	= await this.accountDatabaseService.normalizeURL(url);

		const accountFormattedData	= {
			url: `${this.databaseService.namespace}:${url}`,
			value: await serialize(proto, data)
		};

		await this.databaseService.setItem(
			url,
			BinaryProto,
			isPublic ?
				await this.potassiumService.sign.sign(
					accountFormattedData.value,
					key,
					accountFormattedData.url,
					compressed
				) :
				await this.potassiumService.secretBox.seal(
					accountFormattedData.value,
					key,
					accountFormattedData.url
				)
		);
	}

	/** Tries to get saved PIN hash. */
	public async getSavedPIN () : Promise<Uint8Array|undefined> {
		try {
			const [pinDuration, pinHash, pinTimestamp, timestamp]	= await Promise.all([
				this.localStorageService.getItem('pinDuration', NumberProto),
				this.localStorageService.getItem('pinHash', BinaryProto),
				this.localStorageService.getItem('pinTimestamp', NumberProto),
				getTimestamp()
			]);

			if (timestamp > (pinDuration + pinTimestamp)) {
				await Promise.all([
					this.localStorageService.removeItem('pinDuration'),
					this.localStorageService.removeItem('pinHash'),
					this.localStorageService.removeItem('pinTimestamp')
				]);
			}
			else {
				return this.savePIN(pinHash);
			}
		}
		catch {}

		return;
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
		pin?: string|Uint8Array
	) : Promise<boolean> {
		await this.logout(false);

		if (!username || !masterKey) {
			return false;
		}

		let errorLogMessage: string|undefined;

		try {
			username	= normalize(username);

			if (typeof masterKey === 'string') {
				errorLogMessage	= 'password-hashing masterKey';

				masterKey	= await this.passwordHash(username, masterKey);
			}
			else if (pin !== undefined) {
				errorLogMessage	= 'decrypting masterKey with PIN';

				masterKey	= await this.potassiumService.secretBox.open(
					masterKey,
					typeof pin !== 'string' ? pin : await this.passwordHash(username, pin)
				);
			}

			errorLogMessage	= 'getting user';

			const user		= await this.accountUserLookupService.getUser(username);

			if (!user) {
				throw new Error('Nonexistent user.');
			}

			errorLogMessage	= 'getting loginData';

			const loginData	= await this.getItem(
				`users/${username}/loginData`,
				AccountLoginData,
				masterKey
			);

			try {
				/* Test to see if we can fetch user data before initiating fresh log-in */
				await this.databaseService.getItem(`users/${username}/lastPresence`, BinaryProto);
			}
			catch {
				errorLogMessage	= 'database service login';

				await this.databaseService.login(username, loginData.secondaryPassword);
			}

			errorLogMessage	= 'getting signingKeyPair';

			const signingKeyPair	= await this.getItem(
				`users/${username}/signingKeyPair`,
				KeyPair,
				loginData.symmetricKey
			);

			if (!this.potassiumService.compareMemory(
				signingKeyPair.publicKey,
				(await this.accountDatabaseService.getUserPublicKeys(username)).signing
			)) {
				throw new Error('Invalid certificate.');
			}

			errorLogMessage	= 'getting encryptionKeyPair';

			this.accountDatabaseService.currentUser.next({
				keys: {
					encryptionKeyPair: await this.getItem(
						`users/${username}/encryptionKeyPair`,
						KeyPair,
						loginData.symmetricKey
					),
					signingKeyPair,
					symmetricKey: loginData.symmetricKey
				},
				user
			});

			errorLogMessage	= 'tracking presence';

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

			this.databaseService.registerPushNotifications(`users/${username}/messagingTokens`).
				catch(() => {})
			;

			errorLogMessage	= 'getting pinHash';

			const pinHash	= await this.accountDatabaseService.getItem('pin/hash', BinaryProto);

			errorLogMessage	= 'saving credentials';

			await Promise.all([
				this.localStorageService.setItem(
					'masterKey',
					BinaryProto,
					/* Locally encrypt master key with PIN */
					await this.potassiumService.secretBox.seal(
						masterKey,
						pinHash
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
					(await user.accountUserProfile.getValue()).realUsername
				),
				this.savePIN(pinHash)
			]);
		}
		catch (err) {
			this.errorService.log(`CYPH LOGIN FAILURE: ${errorLogMessage}`, err);
			return false;
		}

		return true;
	}

	/** Logs out. */
	public async logout (clearSavedCredentials: boolean = true) : Promise<boolean> {
		const currentUser	= this.accountDatabaseService.currentUser.value;

		if (!currentUser) {
			return false;
		}

		if (this.statusSaveSubscription) {
			this.statusSaveSubscription.unsubscribe();
		}
		if (this.connectTrackerCleanup) {
			this.connectTrackerCleanup();
			this.connectTrackerCleanup	= undefined;
		}

		await this.databaseService.unregisterPushNotifications(
			`users/${currentUser.user.username}/messagingTokens`
		);

		this.potassiumService.clearMemory(currentUser.keys.symmetricKey);
		this.potassiumService.clearMemory(currentUser.keys.encryptionKeyPair.privateKey);
		this.potassiumService.clearMemory(currentUser.keys.signingKeyPair.privateKey);
		this.potassiumService.clearMemory(currentUser.keys.encryptionKeyPair.publicKey);
		this.potassiumService.clearMemory(currentUser.keys.signingKeyPair.publicKey);

		if (clearSavedCredentials) {
			await Promise.all([
				this.databaseService.logout(),
				this.localStorageService.clear()
			]);
		}

		this.accountDatabaseService.currentUser.next(undefined);
		return true;
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

		const loginData: IAccountLoginData	= {
			secondaryPassword: this.potassiumService.toBase64(
				this.potassiumService.randomBytes(64)
			),
			symmetricKey: this.potassiumService.randomBytes(
				await this.potassiumService.secretBox.keyBytes
			)
		};

		try {
			const [encryptionKeyPair, signingKeyPair]	= await Promise.all([
				this.potassiumService.box.keyPair(),
				this.potassiumService.sign.keyPair(),
				(async () => {
					await this.databaseService.register(username, loginData.secondaryPassword);

					if (inviteCode) {
						await Promise.all([
							this.databaseService.removeItem(`users/${username}/inviteCode`),
							this.databaseService.removeItem(
								`users/${username}/inviterUsernamePlaintext`
							)
						]);

						await this.databaseService.setItem(
							`users/${username}/inviteCode`,
							StringProto,
							inviteCode
						);

						const inviterUsername	=
							await this.databaseService.getAsyncValue(
								`users/${username}/inviterUsernamePlaintext`,
								StringProto,
								undefined,
								true
							).getValue()
						;

						if (!inviterUsername) {
							throw RegistrationErrorCodes.InvalidInviteCode;
						}

						await this.setItem(
							`users/${username}/inviterUsername`,
							StringProto,
							inviterUsername,
							loginData.symmetricKey
						);
					}
				})()
			]);

			await Promise.all([
				this.setItem(
					`users/${username}/loginData`,
					AccountLoginData,
					loginData,
					await this.passwordHash(username, masterKey)
				),
				this.setItem(
					`users/${username}/publicProfile`,
					AccountUserProfile,
					{
						description: '',
						externalUsernames: {},
						hasPremium: false,
						name,
						realUsername,
						userType: AccountUserTypes.Standard
					},
					signingKeyPair.privateKey,
					true,
					true
				).then(async () => !email ? Promise.resolve() : this.databaseService.setItem(
					`users/${username}/email`,
					StringProto,
					email
				).then(
					() => {}
				)),
				this.setItem(
					`users/${username}/publicProfileExtra`,
					AccountUserProfileExtra,
					{},
					signingKeyPair.privateKey,
					true,
					true
				),
				this.setItem(
					`users/${username}/lastPresence`,
					AccountUserPresence,
					{status: AccountUserPresence.Statuses.Online},
					loginData.symmetricKey
				),
				this.setItem(
					`users/${username}/encryptionKeyPair`,
					KeyPair,
					encryptionKeyPair,
					loginData.symmetricKey
				),
				this.setItem(
					`users/${username}/signingKeyPair`,
					KeyPair,
					signingKeyPair,
					loginData.symmetricKey
				),
				this.setItem(
					`users/${username}/certificateRequest`,
					AGSEPKICSR,
					{
						publicSigningKey: signingKeyPair.publicKey,
						username
					},
					signingKeyPair.privateKey,
					true
				),
				this.setItem(
					`users/${username}/pin/hash`,
					BinaryProto,
					await this.passwordHash(username, pin.value),
					loginData.symmetricKey
				),
				this.setItem(
					`users/${username}/pin/isCustom`,
					BooleanProto,
					pin.isCustom,
					loginData.symmetricKey
				),
				this.setItem(
					`users/${username}/publicEncryptionKey`,
					BinaryProto,
					encryptionKeyPair.publicKey,
					signingKeyPair.privateKey,
					true,
					true
				)
			]);
		}
		catch (errorCode) {
			switch (errorCode) {
				case RegistrationErrorCodes.InvalidInviteCode:
					this.errorMessage	= this.stringsService.invalidInviteCode;
					break;

				default:
					this.errorMessage	= undefined;
			}

			await this.databaseService.unregister(username, loginData.secondaryPassword).catch(
				() => {}
			);

			return false;
		}

		return true;
	}

	/** Removes locally saved login credentials. */
	public async removeSavedCredentials () : Promise<void> {
		await Promise.all([
			this.localStorageService.removeItem('masterKey'),
			this.localStorageService.removeItem('pinDuration'),
			this.localStorageService.removeItem('pinHash'),
			this.localStorageService.removeItem('pinIsCustom'),
			this.localStorageService.removeItem('pinTimestamp'),
			this.localStorageService.removeItem('username')
		]);
	}

	/**
	 * Saves PIN locally for specified duration (minutes, default of 60).
	 * @returns PIN hash.
	 */
	public async savePIN (pin: string|Uint8Array, duration?: number) : Promise<Uint8Array> {
		const pinHash	= typeof pin !== 'string' ? pin : await this.passwordHash(
			await this.localStorageService.getItem('username', StringProto),
			pin
		);

		await Promise.all([
			this.localStorageService.setItem(
				'pinDuration',
				NumberProto,
				duration !== undefined ?
					duration * 60000 :
					await this.localStorageService.getItem(
						'pinDuration',
						NumberProto
					).catch(() =>
						3600000
					)
			),
			this.localStorageService.setItem(
				'pinHash',
				BinaryProto,
				pinHash
			),
			this.localStorageService.setItem(
				'pinTimestamp',
				NumberProto,
				await getTimestamp()
			)
		]);

		return pinHash;
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly errorService: ErrorService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {}
}
