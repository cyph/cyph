/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {xkcdPassphrase} from 'xkcd-passphrase';
import {BaseProvider} from '../../base-provider';
import {IProto} from '../../iproto';
import {IResolvable} from '../../iresolvable';
import {
	AccountLoginData,
	AccountUserProfile,
	AccountUserProfileExtra,
	AccountUserTypes,
	AGSEPKICSRData,
	AGSEPKISigningRequest,
	BinaryProto,
	BooleanProto,
	IAccountLoginData,
	IAccountRegistrationMetadata,
	IAccountUserProfile,
	IAccountUserProfileExtra,
	IAGSEPKICSRData,
	IAGSEPKISigningRequest,
	IKeyPair,
	IPrivateKeyring,
	IPublicKeyring,
	NumberProto,
	PrivateKeyring,
	PublicKeyring,
	StringProto
} from '../../proto';
import {errorToString} from '../../util/error';
import {normalize} from '../../util/formatting';
import {debugLog} from '../../util/log';
import {deserialize, serialize} from '../../util/serialization';
import {getTimestamp} from '../../util/time';
import {uuid} from '../../util/uuid';
import {resolvable, sleep} from '../../util/wait';
import {closeWindow} from '../../util/window';
import {AccountUserLookupService} from '../account-user-lookup.service';
import {AnalyticsService} from '../analytics.service';
import {ConfigService} from '../config.service';
import {DatabaseService} from '../database.service';
import {DialogService} from '../dialog.service';
import {EnvService} from '../env.service';
import {ErrorService} from '../error.service';
import {FingerprintService} from '../fingerprint.service';
import {LocalStorageService} from '../local-storage.service';
import {StringsService} from '../strings.service';
import {AccountDatabaseService} from './account-database.service';
import {PotassiumService} from './potassium.service';

/**
 * Account authentication service.
 */
@Injectable()
export class AccountAuthService extends BaseProvider {
	/** @ignore */
	private connectTrackerCleanup?: () => void;

	/** @ignore */
	private readonly defaultPinDuration = 3600000;

	/** User-facing login failure error message. */
	public readonly loginErrorMessage = new BehaviorSubject<string | undefined>(
		undefined
	);

	/** If true, the login prompt will be used to create a pseudo-account. */
	public readonly pseudoAccountLogin = new BehaviorSubject<boolean>(false);

	/** Metadata to set upon registration. */
	public readonly registrationMetadata = new BehaviorSubject<
		IAccountRegistrationMetadata | undefined
	>(undefined);

	/** @ignore */
	private async getItem<T> (
		url: string,
		proto: IProto<T>,
		key: Uint8Array | IPrivateKeyring,
		waitUntilExists: boolean = false
	) : Promise<T> {
		return deserialize(
			proto,
			await this.potassiumService.secretBox.open(
				await this.databaseService.getItem(
					url,
					BinaryProto,
					waitUntilExists
				),
				key,
				`${
					this.databaseService.namespace
				}:${await this.accountDatabaseService.normalizeURL(url)}`
			)
		);
	}

	/** @ignore */
	private async passwordHash (
		username: string,
		password?: string
	) : Promise<Uint8Array> {
		if (typeof password === 'undefined') {
			return new Uint8Array(0);
		}

		username = normalize(username);

		return (
			await this.potassiumService.passwordHash.hash(
				password,
				username + '9BdfYbI5PggWwtnaAXbDRIsTHgMjLx/8hbHvgbQb+qs='
			)
		).hash;
	}

	/** @ignore */
	private reload (reload: boolean = true) : void {
		if (!reload) {
			return;
		}

		if ((<any> self).androidBackbuttonReady) {
			(<any> self).plugins.appMinimize.minimize();
		}

		closeWindow();
	}

	/** @ignore */
	private async setItem<T> (
		url: string,
		proto: IProto<T>,
		data: T,
		key: Uint8Array | IPrivateKeyring,
		isPublic: boolean = false,
		compressed: boolean = false,
		skipSetItem: boolean = false
	) : Promise<Uint8Array> {
		url = await this.accountDatabaseService.normalizeURL(url);

		const accountFormattedData = {
			url: `${this.databaseService.namespace}:${url}`,
			value: await serialize(proto, data)
		};

		const bytes = isPublic ?
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
			);

		if (!skipSetItem) {
			await this.databaseService.setItem(url, BinaryProto, bytes);
		}

		return bytes;
	}

	/** Changes master key. */
	public async changeMasterKey (
		masterKey: string,
		saveCredentials: boolean = false,
		changeDatabasePassword: boolean = true
	) : Promise<void> {
		const currentUser = await this.accountDatabaseService.getCurrentUser();

		if (!currentUser.user.username || masterKey.length === 0) {
			return;
		}

		const url = `users/${currentUser.user.username}/loginData`;
		const symmetricKey = await this.passwordHash(
			currentUser.user.username,
			masterKey
		);

		const newLoginData = !changeDatabasePassword ?
			currentUser.loginData :
			{
				...currentUser.loginData,
				oldSecondaryPassword: currentUser.loginData.secondaryPassword,
				secondaryPassword: this.potassiumService.toBase64(
						this.potassiumService.randomBytes(64)
					)
			};

		await Promise.all<unknown>([
			this.setItem(url, AccountLoginData, newLoginData, symmetricKey),
			changeDatabasePassword ?
				(async () =>
					this.setItem(
						`users/${currentUser.user.username}/loginDataAlt`,
						AccountLoginData,
						newLoginData,
						await this.passwordHash(
							currentUser.user.username,
							await this.getItem(
								`users/${currentUser.user.username}/altMasterKey`,
								StringProto,
								currentUser.loginData.symmetricKey
							)
						)
					))() :
				undefined,
			!saveCredentials ?
				this.removeSavedCredentials() :
				(async () => {
					const pinHash = await this.localStorageService
							.getItem('pinHash', BinaryProto, undefined, true)
							.catch(() => undefined);

					return this.localStorageService.setItem(
						'masterKey',
						BinaryProto,
						/* Locally encrypt master key with PIN */
						pinHash !== undefined ?
							await this.potassiumService.secretBox.seal(
								symmetricKey,
								pinHash
							) :
							symmetricKey,
						undefined,
						undefined,
						true
					);
				})()
		]);

		if (!changeDatabasePassword) {
			return;
		}

		try {
			try {
				await this.databaseService.changePassword(
					currentUser.user.username,
					currentUser.loginData.secondaryPassword,
					newLoginData.secondaryPassword
				);
			}
			catch (err) {
				if (currentUser.loginData.oldSecondaryPassword) {
					await this.databaseService.changePassword(
						currentUser.user.username,
						currentUser.loginData.oldSecondaryPassword,
						newLoginData.secondaryPassword
					);

					newLoginData.oldSecondaryPassword =
						currentUser.loginData.oldSecondaryPassword;

					await this.setItem(
						url,
						AccountLoginData,
						newLoginData,
						symmetricKey
					);
				}
				else {
					throw err;
				}
			}

			currentUser.loginData = newLoginData;
		}
		catch (err) {
			try {
				await this.setItem(
					url,
					AccountLoginData,
					currentUser.loginData,
					symmetricKey
				);
			}
			catch {
				throw err;
			}
		}
	}

	/** Changes lock screen password. */
	public async changePIN (
		pin: {
			isCustom: boolean;
			value: string;
		},
		saveCredentials: boolean = false
	) : Promise<void> {
		const currentUser = await this.accountDatabaseService.getCurrentUser();

		if (!currentUser.user.username || !pin.value) {
			return;
		}

		const pinHash = await this.passwordHash(
			currentUser.user.username,
			pin.value
		);

		await Promise.all<unknown>([
			this.setItem(
				`users/${currentUser.user.username}/pin/hash`,
				BinaryProto,
				pinHash,
				currentUser.keyrings.private
			),
			this.setItem(
				`users/${currentUser.user.username}/pin/isCustom`,
				BooleanProto,
				pin.isCustom,
				currentUser.keyrings.private
			),
			!saveCredentials ?
				this.removeSavedCredentials() :
				this.savePIN(pinHash)
		]);
	}

	/** Gets (and/or sets) alt master key for authenticating a new device. */
	public async getAltMasterKey () : Promise<string> {
		const currentUser = await this.accountDatabaseService.getCurrentUser();

		if (!currentUser.user.username) {
			throw new Error('User not signed in.');
		}

		try {
			return await this.getItem(
				`users/${currentUser.user.username}/altMasterKey`,
				StringProto,
				currentUser.keyrings.private
			);
		}
		catch {}

		const altMasterKey = await xkcdPassphrase.generate(512);

		await Promise.all([
			this.setItem(
				`users/${currentUser.user.username}/altMasterKey`,
				StringProto,
				altMasterKey,
				currentUser.keyrings.private
			),
			Promise.all([
				this.passwordHash(currentUser.user.username, altMasterKey),
				Promise.all([
					this.localStorageService.getItem(
						'masterKey',
						BinaryProto,
						undefined,
						true
					),
					this.localStorageService.getItem(
						'pinHash',
						BinaryProto,
						undefined,
						true
					)
				]).then(async ([masterKey, pinHash]) =>
					this.getItem(
						`users/${currentUser.user.username}/loginData`,
						AccountLoginData,
						await this.potassiumService.secretBox.open(
							masterKey,
							pinHash
						)
					)
				)
			]).then(async ([altMasterKeyHash, loginData]) =>
				this.setItem(
					`users/${currentUser.user.username}/loginDataAlt`,
					AccountLoginData,
					loginData,
					altMasterKeyHash
				)
			)
		]);

		return altMasterKey;
	}

	/** Tries to get saved PIN hash. */
	public async getSavedPIN () : Promise<Uint8Array | undefined> {
		const removePIN = async () =>
			Promise.all([
				this.envService.environment.debug ?
					this.localStorageService.removeItem('pinDuration') :
					undefined,
				this.localStorageService.removeItem('pinHash'),
				this.localStorageService.removeItem('pinTimestamp')
			]);

		try {
			const pinHash = await this.localStorageService.getItem(
				'pinHash',
				BinaryProto,
				undefined,
				true
			);
			if (pinHash.length === 0) {
				return pinHash;
			}

			if (await this.fingerprintService.supported) {
				if (await this.fingerprintService.authenticate()) {
					return this.savePIN(pinHash);
				}

				await removePIN();
				return;
			}

			const [
				hasUnconfirmedMasterKey,
				pinDuration,
				pinTimestamp,
				timestamp
			] = await Promise.all([
				this.localStorageService.hasItem('unconfirmedMasterKey', true),
				this.envService.environment.debug ?
					this.localStorageService.getItem(
						'pinDuration',
						NumberProto,
						undefined,
						true
					) :
					this.defaultPinDuration,
				this.localStorageService.getItem(
					'pinTimestamp',
					NumberProto,
					undefined,
					true
				),
				getTimestamp()
			]);

			if (
				hasUnconfirmedMasterKey ||
				timestamp > pinDuration + pinTimestamp
			) {
				await removePIN();
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
			(
				await Promise.all(
					['masterKey', 'pinIsCustom', 'username'].map(async k =>
						this.localStorageService.hasItem(k, true)
					)
				)
			).filter(b => !b).length < 1
		);
	}

	/** Removes PIN from local storage. */
	public async lock (reload: boolean = true) : Promise<void> {
		await this.localStorageService.removeItem('pinHash');
		this.reload(reload);
	}

	/**
	 * Logs in.
	 * @returns Whether login was successful.
	 */
	/* eslint-disable-next-line complexity */
	public async login (
		username: string,
		masterKey: string | Uint8Array,
		pin?: string | Uint8Array,
		altMasterKey: boolean = false,
		midRegistration?: boolean
	) : Promise<boolean> {
		this.loginErrorMessage.next(undefined);

		const logoutPromise = this.logout(false, false, false);

		if (!username || masterKey.length === 0) {
			return false;
		}

		let dismissToast: IResolvable<() => void> | undefined;
		let errorLogMessage: string | undefined;

		const setErrorMessageLog = (s: string) => {
			errorLogMessage = s;
			debugLog(() => ({accountAuthLoginMessage: s}));
		};

		try {
			username = normalize(username);

			const userPromise = this.accountUserLookupService.getUser(username);

			/* Cache result */
			this.accountDatabaseService
				.getUserPublicKeys(username)
				.catch(() => undefined);

			if (
				this.envService.isCordova &&
				this.configService.betaTestUsers.has(username) &&
				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				localStorage.getItem('betaTestUser') !== 'true'
			) {
				try {
					/* eslint-disable-next-line @typescript-eslint/tslint/config */
					localStorage.setItem('betaTestUser', 'true');
					/* eslint-disable-next-line @typescript-eslint/tslint/config */
					localStorage.removeItem('webSignPackageTimestamp');
				}
				catch {}
			}

			if (typeof masterKey === 'string') {
				setErrorMessageLog('password-hashing masterKey');

				masterKey = await this.passwordHash(username, masterKey);
			}
			else if (pin !== undefined && pin.length > 0) {
				setErrorMessageLog('decrypting masterKey with PIN');

				masterKey = await this.potassiumService.secretBox.open(
					masterKey,
					typeof pin !== 'string' ?
						pin :
						await this.passwordHash(username, pin)
				);
			}

			setErrorMessageLog('getting loginData');

			const loginDataURL = `users/${username}/loginData${
				altMasterKey ? 'Alt' : ''
			}`;

			const loginDataPromise = this.getItem(
				loginDataURL,
				AccountLoginData,
				masterKey,
				altMasterKey
			);

			if (!(await this.databaseService.hasItem(loginDataURL))) {
				dismissToast = resolvable<() => void>();

				this.dialogService
					.toast(
						this.stringsService.newDeviceActivationRegisterToast,
						-1,
						undefined,
						dismissToast
					)
					.catch(() => {});
			}

			const loginData = await loginDataPromise;

			setErrorMessageLog('getting user data');

			if (dismissToast) {
				(await dismissToast)();
				dismissToast = undefined;
			}

			const getUserData = async () =>
				Promise.all([
					this.accountDatabaseService.getUserKeyrings(
						username,
						loginData.symmetricKey,
						async updateComplete => {
							await this.dialogService.alert({
								content: this.stringsService.updateKeyrings,
								markdown: true,
								title: this.stringsService.updateKeyringsTitle
							});

							await updateComplete;

							await this.dialogService.alert({
								content:
									this.stringsService.updateKeyringsComplete,
								title: this.stringsService.updateKeyringsTitle
							});
						}
					),
					Promise.all([
						midRegistration ||
							this.databaseService.hasItem(
								`users/${username}/masterKeyUnconfirmed`
							),
						this.localStorageService.hasItem(
							'unconfirmedMasterKey',
							true
						)
					]).then(
						([masterKeyUnconfirmed, hasUnconfirmedMasterKey]) =>
							!masterKeyUnconfirmed || !hasUnconfirmedMasterKey
					),
					this.getItem(
						`users/${username}/pin/hash`,
						BinaryProto,
						loginData.symmetricKey
					),
					this.databaseService.hasItem(
						`users/${username}/pseudoAccount`
					),
					userPromise,
					logoutPromise
				]);

			/* Test to see if we can fetch user data before initiating fresh log-in */
			const [
				{publicKeyringConfirmed: agseConfirmed, ...keyrings},
				masterKeyConfirmed,
				pinHash,
				pseudoAccount,
				user
			] = await getUserData().catch(async () => {
				setErrorMessageLog('database service login');

				try {
					await this.databaseService.login(
						username,
						loginData.secondaryPassword
					);
				}
				catch (err) {
					/*
						Firebase auth error message;
						see https://firebase.google.com/docs/reference/js/firebase.auth.Error
					*/
					this.loginErrorMessage.next(
						this.stringsService.setParameters(
							this.stringsService.authError,
							{
								error: errorToString(err)
							}
						)
					);

					if (loginData.oldSecondaryPassword) {
						await this.databaseService.login(
							username,
							loginData.oldSecondaryPassword
						);
					}
					else {
						throw err;
					}
				}

				return getUserData();
			});

			if (!user) {
				throw new Error('User does not exist.');
			}

			this.accountDatabaseService.currentUser.next({
				agseConfirmed,
				keyrings,
				loginData,
				masterKeyConfirmed,
				pseudoAccount,
				user
			});

			/*
			Disable statuses for now:

			setErrorMessageLog('tracking presence');

			this.connectTrackerCleanup = await this.databaseService.setConnectTracker(
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

			this.subscriptions.push(
				this.databaseService
					.watch(
						`users/${username}/presence`,
						AccountUserPresence,
						this.subscriptions
					)
					.pipe(skip(1))
					.subscribe(({timestamp, value}) => {
						if (isNaN(timestamp)) {
							return;
						}

						this.accountDatabaseService.setItem(
							'lastPresence',
							AccountUserPresence,
							value
						);
					})
			);
			*/

			this.databaseService
				.registerPushNotifications(`users/${username}/messagingTokens`)
				.catch(() => {});

			setErrorMessageLog('saving credentials');

			await Promise.all([
				this.localStorageService.setItem(
					'altMasterKey',
					BooleanProto,
					altMasterKey,
					undefined,
					undefined,
					true
				),
				(async () =>
					this.localStorageService.setItem(
						'masterKey',
						BinaryProto,
						/* Locally encrypt master key with PIN */
						pinHash.length > 0 ?
							await this.potassiumService.secretBox.seal(
								masterKey,
								pinHash
							) :
							masterKey,
						undefined,
						undefined,
						true
					))(),
				this.localStorageService.setItem(
					'username',
					StringProto,
					username,
					undefined,
					undefined,
					true
				)
			]);

			Promise.all([
				(async () =>
					this.localStorageService.setItem(
						'pinIsCustom',
						BinaryProto,
						await this.accountDatabaseService.getItem(
							'pin/isCustom',
							BinaryProto
						),
						undefined,
						undefined,
						true
					))(),
				(async () =>
					this.localStorageService.setItem(
						'username',
						StringProto,
						(await user.accountUserProfile.getValue()).realUsername,
						undefined,
						undefined,
						true
					))(),
				this.savePIN(pinHash)
			])
				.then(() => {
					debugLog(() => 'credentials fully saved');
				})
				.catch(() => {});
		}
		catch (err) {
			this.errorService.log(
				`CYPH LOGIN FAILURE: ${errorLogMessage}`,
				err,
				undefined,
				true
			);
			return false;
		}
		finally {
			if (dismissToast) {
				(await dismissToast)();
			}
		}

		this.analyticsService.sendEvent('login', 'success');
		this.loginErrorMessage.next(undefined);

		return true;
	}

	/** Logs out. */
	public async logout (
		clearSavedCredentials: boolean = true,
		timeouts: boolean = true,
		reload: boolean = true
	) : Promise<boolean> {
		const currentUser = this.accountDatabaseService.currentUser.value;

		if (!currentUser) {
			return false;
		}

		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		this.ngOnDestroy();

		if (this.connectTrackerCleanup) {
			this.connectTrackerCleanup();
			this.connectTrackerCleanup = undefined;
		}

		const unregisterPushNotificationsPromise = this.databaseService
			.unregisterPushNotifications(
				`users/${currentUser.user.username}/messagingTokens`
			)
			.catch(() => {});

		await (timeouts ?
			Promise.race([unregisterPushNotificationsPromise, sleep(1000)]) :
			unregisterPushNotificationsPromise);

		for (const keyring of [
			currentUser.keyrings.private,
			currentUser.keyrings.public
		]) {
			for (const keyGroup of Object.values(keyring)) {
				for (const o of Object.values(keyGroup)) {
					const keys =
						o instanceof Uint8Array ?
							[o] :
						typeof o === 'object' &&
							/* eslint-disable-next-line eqeqeq, no-null/no-null */
							o != null &&
							'privateKey' in o ?
							[
								(<IKeyPair> o).privateKey,
								(<IKeyPair> o).publicKey
							] :
							[];

					for (const key of keys) {
						this.potassiumService.clearMemory(key);
					}
				}
			}
		}

		if (clearSavedCredentials) {
			const databaseLogoutPromise = this.databaseService.logout();

			await Promise.all([
				timeouts ?
					Promise.race([databaseLogoutPromise, sleep(1000)]) :
					databaseLogoutPromise,
				this.removeSavedCredentials()
			]).catch(() => {});
		}

		this.accountDatabaseService.currentUser.next(undefined);
		this.reload(reload);
		return true;
	}

	/** Registers. */
	public async register (
		realUsername: string | {pseudoAccount: true},
		masterKey?: string,
		altMasterKey?: string,
		pin: {isCustom: boolean; value?: string} = {isCustom: true},
		name: string = '',
		email?: string,
		inviteCode?: string,
		profileExtra: IAccountUserProfileExtra = {}
	) : Promise<boolean> {
		const currentBoxAlgorithm = await this.potassiumService.box
			.currentAlgorithm;
		const currentSecretBoxAlgorithm = await this.potassiumService.secretBox
			.currentAlgorithm;
		const currentSignAlgorithm = await this.potassiumService.sign
			.currentAlgorithm;

		let pseudoAccount = false;
		if (typeof realUsername !== 'string') {
			pseudoAccount = true;
			realUsername = uuid(true);
		}

		if (
			!realUsername ||
			(!pseudoAccount &&
				(masterKey === undefined || masterKey.length === 0)) ||
			(!pseudoAccount && !inviteCode)
		) {
			return false;
		}

		const username = normalize(realUsername);

		const loginData: IAccountLoginData = {
			secondaryPassword: this.potassiumService.toBase64(
				this.potassiumService.randomBytes(64)
			),
			symmetricKey: await this.potassiumService.secretBox.generateKey()
		};

		try {
			const [
				encryptionKeyPair,
				signingKeyPair,
				hardenedSigningKeyPair,
				masterKeyHash,
				altMasterKeyHash,
				pinHash
			] = await Promise.all([
				this.potassiumService.box.keyPair(),
				this.potassiumService.sign.keyPair(),
				this.potassiumService.sign.keyPair(
					currentSignAlgorithm.hardened
				),
				typeof masterKey === 'string' ?
					this.passwordHash(username, masterKey) :
					this.potassiumService.secretBox.generateKey(),
				typeof altMasterKey === 'string' ?
					this.passwordHash(username, altMasterKey) :
					undefined,
				this.passwordHash(username, pin.value)
			]);

			const [
				registerLoginData,
				registerLoginDataAlt,
				registerAltMasterKey,
				registerPrivateKeyring,
				registerPublicProfile,
				registerPublicProfileExtra,
				registerCertificateRequest,
				registerPinHash,
				registerPinIsCustom,
				registerPublicKeyring
			] = await Promise.all([
				this.setItem(
					`users/${username}/loginData`,
					AccountLoginData,
					loginData,
					masterKeyHash,
					undefined,
					undefined,
					true
				),
				altMasterKeyHash !== undefined ?
					this.setItem(
						`users/${username}/loginDataAlt`,
						AccountLoginData,
						loginData,
						altMasterKeyHash,
						undefined,
						undefined,
						true
					) :
					undefined,
				altMasterKey !== undefined ?
					this.setItem(
						`users/${username}/altMasterKey`,
						StringProto,
						altMasterKey,
						loginData.symmetricKey,
						undefined,
						undefined,
						true
					) :
					undefined,
				this.setItem<IPrivateKeyring>(
					`users/${username}/keyrings/private`,
					PrivateKeyring,
					{
						boxPrivateKeys: {
							[currentBoxAlgorithm]: encryptionKeyPair
						},
						secretBoxPrivateKeys: {
							[currentSecretBoxAlgorithm]: loginData.symmetricKey
						},
						signPrivateKeys: {
							[currentSignAlgorithm.hardened]:
								hardenedSigningKeyPair,
							[currentSignAlgorithm.primary]: signingKeyPair
						}
					},
					loginData.symmetricKey,
					undefined,
					undefined,
					true
				),
				this.setItem<IAccountUserProfile>(
					`users/${username}/publicProfile`,
					AccountUserProfile,
					{
						description: '',
						externalUsernames: {},
						name,
						realUsername,
						userType:
							this.envService.isTelehealth &&
							!this.envService.isTelehealthFull ?
								AccountUserTypes.TelehealthDoctor :
								AccountUserTypes.Standard
					},
					signingKeyPair.privateKey,
					true,
					true,
					true
				),
				this.setItem<IAccountUserProfileExtra>(
					`users/${username}/publicProfileExtra`,
					AccountUserProfileExtra,
					profileExtra,
					signingKeyPair.privateKey,
					true,
					true,
					true
				),
				/*
				Disable statuses for now:

				this.setItem(
					`users/${username}/lastPresence`,
					AccountUserPresence,
					{status: AccountUserPresence.Statuses.Online},
					loginData.symmetricKey,
					undefined,
					undefined,
					true
				),
				*/
				pseudoAccount ?
					new Uint8Array(0) :
					this.setItem<IAGSEPKICSRData>(
						`users/${username}/keyrings/csr`,
						AGSEPKICSRData,
						{
							publicSigningKey: signingKeyPair.publicKey,
							username
						},
						signingKeyPair.privateKey,
						true,
						undefined,
						true
					).then(async data =>
						serialize<IAGSEPKISigningRequest>(
							AGSEPKISigningRequest,
							{
								algorithm: currentSignAlgorithm.primary,
								data
							}
						)
					),
				this.setItem(
					`users/${username}/pin/hash`,
					BinaryProto,
					pinHash,
					loginData.symmetricKey,
					undefined,
					undefined,
					true
				),
				this.setItem(
					`users/${username}/pin/isCustom`,
					BooleanProto,
					pin.isCustom,
					loginData.symmetricKey,
					undefined,
					undefined,
					true
				),
				this.setItem<IPublicKeyring>(
					`users/${username}/keyrings/public`,
					PublicKeyring,
					{
						boxPublicKeys: {
							[currentBoxAlgorithm]: encryptionKeyPair.publicKey
						},
						signPublicKeys: {
							[currentSignAlgorithm.hardened]:
								hardenedSigningKeyPair.publicKey,
							[currentSignAlgorithm.primary]:
								signingKeyPair.publicKey
						}
					},
					signingKeyPair.privateKey,
					true,
					true,
					true
				)
			]);

			await Promise.all([
				(async () =>
					this.localStorageService.setItem(
						'masterKey',
						BinaryProto,
						/* Locally encrypt master key with PIN */
						pinHash.length > 0 ?
							await this.potassiumService.secretBox.seal(
								masterKeyHash,
								pinHash
							) :
							masterKeyHash,
						undefined,
						undefined,
						true
					))(),
				this.localStorageService.setItem(
					'username',
					StringProto,
					username,
					undefined,
					undefined,
					true
				),
				this.localStorageService.setItem(
					'pinIsCustom',
					BooleanProto,
					pin.isCustom,
					undefined,
					undefined,
					true
				),
				this.savePIN(pinHash)
			]);

			await this.databaseService.register(
				username,
				loginData.secondaryPassword,
				{
					altMasterKey: registerAltMasterKey,
					certificateRequest: registerCertificateRequest,
					email,
					inviteCode,
					loginData: registerLoginData,
					loginDataAlt: registerLoginDataAlt,
					pinHash: registerPinHash,
					pinIsCustom: registerPinIsCustom,
					privateKeyring: registerPrivateKeyring,
					pseudoAccount,
					publicKeyring: registerPublicKeyring,
					publicProfile: registerPublicProfile,
					publicProfileExtra: registerPublicProfileExtra
				}
			);

			const loginSuccess = await this.login(
				username,
				masterKeyHash,
				undefined,
				undefined,
				true
			);

			if (inviteCode) {
				const inviterUsername = await this.databaseService
					.getItem(
						`users/${username}/inviterUsernamePlaintext`,
						StringProto
					)
					.catch(() => '');

				await Promise.all<unknown>([
					this.setItem(
						`users/${username}/inviterUsername`,
						StringProto,
						inviterUsername,
						loginData.symmetricKey
					),
					inviterUsername && inviterUsername !== username ?
						this.databaseService.callFunction('setContact', {
							add: true,
							username: inviterUsername
						}) :
						Promise.resolve()
				]);
			}

			return loginSuccess;
		}
		catch {
			return false;
		}
	}

	/** Removes locally saved login credentials. */
	public async removeSavedCredentials () : Promise<void> {
		try {
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			localStorage.removeItem('betaTestUser');
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			localStorage.removeItem('webSignPackageTimestamp');
		}
		catch {}

		await this.localStorageService.clear();
	}

	/**
	 * Saves PIN locally for specified duration (minutes, default of 60).
	 * @returns PIN hash.
	 */
	public async savePIN (
		pin: string | Uint8Array,
		duration?: number
	) : Promise<Uint8Array> {
		const pinHash =
			typeof pin !== 'string' ?
				pin :
				await this.passwordHash(
					await this.localStorageService.getItem(
						'username',
						StringProto,
						undefined,
						true
					),
					pin
				);

		await Promise.all<unknown>([
			!this.envService.environment.debug || pin.length === 0 ?
				Promise.resolve() :
				this.localStorageService.setItem(
					'pinDuration',
					NumberProto,
					duration !== undefined ?
						duration * 60000 :
						await this.localStorageService
							.getItem(
								'pinDuration',
								NumberProto,
								undefined,
								true
							)
							.catch(() => this.defaultPinDuration),
					undefined,
					undefined,
					true
				),
			this.localStorageService.setItem(
				'pinHash',
				BinaryProto,
				pinHash,
				undefined,
				undefined,
				true
			),
			pin.length === 0 ?
				Promise.resolve() :
				this.localStorageService.setItem(
					'pinTimestamp',
					NumberProto,
					await getTimestamp(),
					undefined,
					undefined,
					true
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
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly errorService: ErrorService,

		/** @ignore */
		private readonly fingerprintService: FingerprintService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();
	}
}
