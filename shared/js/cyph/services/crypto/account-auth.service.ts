import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {AccountLoginData, IAccountLoginData, IKeyPair, KeyPair} from '../../../proto';
import {util} from '../../util';
import {AccountUserLookupService} from '../account-user-lookup.service';
import {DatabaseService} from '../database.service';
import {LocalStorageService} from '../local-storage.service';
import {AccountDatabaseService} from './account-database.service';
import {PotassiumService} from './potassium.service';


/**
 * Account authentication service.
 */
@Injectable()
export class AccountAuthService {
	/** @ignore */
	private readonly loginDataSalt: Uint8Array	=
		this.potassiumService.fromBase64('9BdfYbI5PggWwtnaAXbDRIsTHgMjLx/8hbHvgbQb+qs=')
	;

	/** @ignore */
	private resolveReady: () => void;

	/** Fires on successful login. */
	public readonly onLogin: Subject<void>	= new Subject<void>();

	/** Resolves when this service is ready for use. */
	public readonly ready: Promise<void>	= new Promise<void>(resolve => {
		this.resolveReady	= resolve;
	});

	/** @ignore */
	private async getKeyPair (url: string, symmetricKey: Uint8Array) : Promise<IKeyPair> {
		return util.bytesToObject<IKeyPair>(
			await this.potassiumService.secretBox.open(
				await this.databaseService.getItem(url),
				symmetricKey
			),
			KeyPair
		);
	}

	/** @ignore */
	private async passwordHash (password: string) : Promise<Uint8Array> {
		return (
			await this.potassiumService.passwordHash.hash(
				password,
				this.loginDataSalt
			)
		).hash;
	}

	/**
	 * Logs in.
	 * @returns Whether login was successful.
	 */
	public async login (username: string, password: string|Uint8Array) : Promise<boolean> {
		this.accountDatabaseService.current	= undefined;

		if (!username || !password) {
			return false;
		}

		try {
			if (typeof password === 'string') {
				password	= await this.passwordHash(password);
			}

			const user		= await this.accountUserLookupService.getUser(username);

			const loginData	= util.bytesToObject<IAccountLoginData>(
				await this.potassiumService.secretBox.open(
					await this.databaseService.getItem(`users/${username}/loginData`),
					password
				),
				AccountLoginData
			);

			await this.databaseService.login(username, loginData.secondaryPassword);
			await this.localStorageService.setItem('username', username);
			await this.localStorageService.setItem('password', password);

			this.accountDatabaseService.current	= {
				keys: {
					encryptionKeyPair: await this.getKeyPair(
						`users/${username}/encryptionKeyPair`,
						loginData.symmetricKey
					),
					signingKeyPair: await this.getKeyPair(
						`users/${username}/signingKeyPair`,
						loginData.symmetricKey
					),
					symmetricKey: loginData.symmetricKey
				},
				user
			};

			this.onLogin.next();
		}
		catch (_) {
			return false;
		}

		return true;
	}

	/** Logs out. */
	public async logout () : Promise<void> {
		await this.localStorageService.removeItem('password');
		await this.localStorageService.removeItem('username');
		this.databaseService.logout();

		if (!this.accountDatabaseService.current) {
			return;
		}

		this.potassiumService.clearMemory(
			this.accountDatabaseService.current.keys.symmetricKey
		);
		this.potassiumService.clearMemory(
			this.accountDatabaseService.current.keys.encryptionKeyPair.privateKey
		);
		this.potassiumService.clearMemory(
			this.accountDatabaseService.current.keys.signingKeyPair.privateKey
		);
		this.potassiumService.clearMemory(
			this.accountDatabaseService.current.keys.encryptionKeyPair.publicKey
		);
		this.potassiumService.clearMemory(
			this.accountDatabaseService.current.keys.signingKeyPair.publicKey
		);

		this.accountDatabaseService.current	= undefined;
	}

	/** Registers. */
	public async register (username: string, password: string) : Promise<boolean> {
		if (!username || !password) {
			return false;
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
			await this.databaseService.register(username, loginData.secondaryPassword);

			await this.databaseService.setItem(
				`users/${username}/loginData`,
				await this.potassiumService.secretBox.seal(
					await util.toBytes({data: loginData, proto: AccountLoginData}),
					await this.passwordHash(password)
				)
			);
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
		private readonly potassiumService: PotassiumService
	) { (async () => {
		const username	= await this.localStorageService.getItemString('username');
		const password	= await this.localStorageService.getItem('password');

		if (username && password) {
			await this.login(username, password);
		}

		this.resolveReady();
	})(); }
}
