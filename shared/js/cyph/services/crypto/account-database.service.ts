/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, combineLatest, Observable, of, Subscription} from 'rxjs';
import {map, mergeMap, take} from 'rxjs/operators';
import {ICurrentUser, publicSigningKeys, SecurityModels} from '../../account';
import {IAsyncList} from '../../iasync-list';
import {IAsyncMap} from '../../iasync-map';
import {IAsyncValue} from '../../iasync-value';
import {IProto} from '../../iproto';
import {ITimedValue} from '../../itimed-value';
import {LockFunction} from '../../lock-function-type';
import {MaybePromise} from '../../maybe-promise-type';
import {
	AccountUserPublicKeys,
	AGSEPKICert,
	BinaryProto,
	IAccountUserPublicKeys,
	NotificationTypes,
	StringProto
} from '../../proto';
import {filterUndefinedOperator} from '../../util/filter';
import {cacheObservable, flattenObservable} from '../../util/flatten-observable';
import {normalize} from '../../util/formatting';
import {lockFunction} from '../../util/lock';
import {deserialize, serialize} from '../../util/serialization';
import {resolvable, retryUntilSuccessful} from '../../util/wait';
import {DatabaseService} from '../database.service';
import {EnvService} from '../env.service';
import {LocalStorageService} from '../local-storage.service';
import {PotassiumService} from './potassium.service';


/**
 * Account database service.
 * Setting public data signs it and getting public data verifies it.
 * Setting private data encrypts it and getting private data decrypts it.
 */
@Injectable()
export class AccountDatabaseService {
	/** @ignore */
	private async getUsernameFromURL (
		url: MaybePromise<string>,
		other: boolean = false
	) : Promise<string> {
		url	= await url;

		return !other ?
			(url.match(/\/?users\/(.*?)\//) || [])[1] || '' :
			(url.match(/\/?users\/.*\/([^\/]+)$/) || [])[1] || ''
		;
	}

	/** @ignore */
	private readonly agsePublicSigningKeys	= this.envService.environment.useProdSigningKeys ?
		publicSigningKeys.prod :
		publicSigningKeys.test
	;

	/** @ignore */
	private readonly openHelpers		= {
		secretBox: async (
			data: Uint8Array,
			url: string,
			customKey: MaybePromise<Uint8Array>|undefined
		) =>
			this.potassiumHelpers.secretBox.open(
				data,
				(await customKey) || (await this.getCurrentUser()).keys.symmetricKey,
				url
			)
		,
		sign: async (
			data: Uint8Array,
			url: string,
			decompress: boolean,
			usernameOther: boolean = false
		) => {
			const username	= await this.getUsernameFromURL(url, usernameOther);

			return this.localStorageService.getOrSetDefault(
				`AccountDatabaseService.open/${
					username
				}/${
					this.potassiumService.toBase64(
						await this.potassiumService.hash.hash(data)
					)
				}`,
				BinaryProto,
				async () => this.potassiumHelpers.sign.open(
					data,
					this.currentUser.value && username === this.currentUser.value.user.username ?
						this.currentUser.value.keys.signingKeyPair.publicKey :
						(await this.getUserPublicKeys(username)).signing
					,
					url,

					decompress
				)
			);
		}
	};

	/** @ignore */
	private readonly potassiumHelpers	= {
		secretBox: {
			open: async (
				cyphertext: Uint8Array,
				key: Uint8Array,
				additionalData: string
			) : Promise<Uint8Array> => this.potassiumService.secretBox.open(
				cyphertext,
				key,
				`${this.databaseService.namespace}:${additionalData}`
			),
			seal: async (
				plaintext: Uint8Array,
				key: Uint8Array,
				additionalData: string
			) : Promise<Uint8Array> => this.potassiumService.secretBox.seal(
				plaintext,
				key,
				`${this.databaseService.namespace}:${additionalData}`
			)
		},
		sign: {
			open: async (
				signed: Uint8Array,
				publicKey: Uint8Array,
				additionalData: string,
				decompress: boolean
			) : Promise<Uint8Array> => this.potassiumService.sign.open(
				signed,
				publicKey,
				`${this.databaseService.namespace}:${additionalData}`,
				decompress
			),
			sign: async (
				message: Uint8Array,
				privateKey: Uint8Array,
				additionalData: string,
				compress: boolean
			) : Promise<Uint8Array> => this.potassiumService.sign.sign(
				message,
				privateKey,
				`${this.databaseService.namespace}:${additionalData}`,
				compress
			)
		}
	};

	/** @ignore */
	private readonly sealHelpers		= {
		secretBox: async (
			data: Uint8Array,
			url: string,
			customKey: MaybePromise<Uint8Array>|undefined
		) =>
			retryUntilSuccessful(async () => this.potassiumHelpers.secretBox.seal(
				data,
				(await customKey) || (await this.getCurrentUser()).keys.symmetricKey,
				url
			))
		,
		sign: async (
			data: Uint8Array,
			url: string,
			compress: boolean
		) =>
			retryUntilSuccessful(async () => this.potassiumHelpers.sign.sign(
				data,
				(await this.getCurrentUser()).keys.signingKeyPair.privateKey,
				url,
				compress
			))
	};

	/** @see getCurrentUser */
	public readonly currentUser: BehaviorSubject<ICurrentUser|undefined>	=
		new BehaviorSubject<ICurrentUser|undefined>(undefined)
	;

	/** @see getCurrentUser */
	public readonly currentUserFiltered: Observable<ICurrentUser>			=
		this.currentUser.pipe(filterUndefinedOperator<ICurrentUser>())
	;

	/** @ignore */
	private async getItemInternal<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels,
		customKey: MaybePromise<Uint8Array>|undefined,
		anonymous: boolean = false,
		moreAdditionalData?: string
	) : Promise<{
		progress: Observable<number>;
		result: ITimedValue<T>;
	}> {
		url	= await url;

		if (!anonymous && this.currentUser.value) {
			url	= await this.normalizeURL(url);
			await this.waitForUnlock(url);
		}

		const downloadTask	= this.databaseService.downloadItem(url, BinaryProto);
		const result		= await downloadTask.result;

		return {
			progress: downloadTask.progress,
			result: {
				timestamp: result.timestamp,
				value: await this.open(
					url,
					proto,
					securityModel,
					result.value,
					customKey,
					anonymous,
					moreAdditionalData
				)
			}
		};
	}

	/** @ignore */
	private async getListInternal<T> (
		head: string|undefined,
		keys: string[],
		url: string,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		immutable: boolean = true
	) : Promise<ITimedValue<T>[]> {
		if (head !== undefined) {
			keys	= keys.slice(0, keys.lastIndexOf(head) + 1);
		}
		else if (immutable) {
			return [];
		}

		return Promise.all(keys.map(async (k, i) =>
			(await this.getItemInternal(
				`${url}/${k}`,
				proto,
				securityModel,
				customKey,
				anonymous,
				!immutable ? undefined : i > 0 ? keys[i - 1] : ''
			)).result
		));
	}

	/** @ignore */
	private async open<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels,
		data: Uint8Array,
		customKey: MaybePromise<Uint8Array>|undefined,
		anonymous: boolean = false,
		moreAdditionalData?: string
	) : Promise<T> {
		url	= await url;
		url	= moreAdditionalData !== undefined ? `${url}?${moreAdditionalData}` : url;

		const currentUser	= anonymous ? undefined : await this.getCurrentUser();

		return deserialize(proto, await (async () => {
			if (securityModel === SecurityModels.public) {
				return this.openHelpers.sign(data, url, true);
			}
			else if (securityModel === SecurityModels.publicFromOtherUsers) {
				return this.openHelpers.sign(data, url, true, true);
			}
			else if (securityModel === SecurityModels.unprotected) {
				return data;
			}

			if (!currentUser) {
				throw new Error('Cannot anonymously open private data.');
			}

			switch (securityModel) {
				case SecurityModels.private:
					return this.openHelpers.secretBox(data, url, customKey);
				case SecurityModels.privateSigned:
					return this.openHelpers.sign(
						await this.openHelpers.secretBox(data, url, customKey),
						url,
						false
					);
				default:
					throw new Error('Invalid security model.');
			}
		})());
	}

	/** @ignore */
	private async processLockURL (url: MaybePromise<string>) : Promise<string> {
		const currentUser	= await this.getCurrentUser();

		return `users/${currentUser.user.username}/locks/` + this.potassiumService.toHex(
			await this.potassiumService.hash.hash(
				(await this.normalizeURL(url)).replace(
					`users/${currentUser.user.username}/`,
					''
				)
			)
		);
	}

	/** @ignore */
	private async seal<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		value: T,
		securityModel: SecurityModels,
		customKey: MaybePromise<Uint8Array>|undefined,
		moreAdditionalData?: string
	) : Promise<Uint8Array> {
		url			= await this.normalizeURL(url);
		url			= moreAdditionalData !== undefined ? `${url}?${moreAdditionalData}` : url;
		const data	= await serialize(proto, value);

		switch (securityModel) {
			case SecurityModels.private:
				return this.sealHelpers.secretBox(data, url, customKey);
			case SecurityModels.privateSigned:
				return this.sealHelpers.secretBox(
					await this.sealHelpers.sign(data, url, false),
					url,
					customKey
				);
			case SecurityModels.public:
			case SecurityModels.publicFromOtherUsers:
				return this.sealHelpers.sign(data, url, true);
			case SecurityModels.unprotected:
				return data;
			default:
				throw new Error('Invalid security model.');
		}
	}

	/** @see DatabaseService.downloadItem */
	public downloadItem<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false
	) : {
		progress: Observable<number>;
		result: Promise<ITimedValue<T>>;
	} {
		const progress	= new BehaviorSubject(0);

		const result	= (async () => {
			const downloadTask	= await this.getItemInternal(
				url,
				proto,
				securityModel,
				customKey,
				anonymous
			);

			downloadTask.progress.subscribe(
				n => { progress.next(n); },
				err => { progress.error(err); },
				() => { progress.complete(); }
			);

			return downloadTask.result;
		})();

		return {progress, result};
	}

	/** @see DatabaseService.getAsyncList */
	public getAsyncList<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		immutable: boolean = true,
		noBlobStorage: boolean = false
	) : IAsyncList<T> {
		const localLock	= lockFunction();

		/* See https://github.com/Microsoft/tslint-microsoft-contrib/issues/381 */
		/* tslint:disable-next-line:no-unnecessary-local-variable */
		const asyncList: IAsyncList<T>	= {
			clear: async () => localLock(async () => this.removeItem(url)),
			getValue: async () => localLock(async () =>
				this.getList(url, proto, securityModel, customKey, anonymous, immutable)
			),
			lock: async (f, reason) => this.lock(url, f, reason),
			pushValue: async value => localLock(async () => {
				await this.pushItem(
					url,
					proto,
					value,
					securityModel,
					customKey,
					immutable,
					noBlobStorage
				);
			}),
			setValue: async value => localLock(async () =>
				this.setList(url, proto, value, securityModel, customKey, immutable, noBlobStorage)
			),
			subscribeAndPop: f => {
				if (immutable) {
					throw new Error('Cannot subscribeAndPop immutable list.');
				}

				return this.subscribeAndPop(
					url,
					proto,
					f,
					securityModel,
					customKey,
					anonymous
				);
			},
			updateValue: async f => asyncList.lock(async () =>
				asyncList.setValue(await f(await asyncList.getValue()))
			),
			watch: memoize(() => this.watchList(
				url,
				proto,
				securityModel,
				customKey,
				anonymous,
				immutable
			).pipe(map<ITimedValue<T>[], T[]>(
				arr => arr.map(o => o.value)
			))),
			watchPushes: memoize(() => this.watchListPushes(
				url,
				proto,
				securityModel,
				customKey,
				anonymous,
				immutable
			).pipe(map<ITimedValue<T>, T>(
				o => o.value
			)))
		};

		return asyncList;
	}

	/** @see DatabaseService.getAsyncMap */
	public getAsyncMap<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		noBlobStorage: boolean = false
	) : IAsyncMap<string, T> {
		const localLock			= lockFunction();

		const baseAsyncMap		= (async () => {
			url	= await this.normalizeURL(url);

			return this.databaseService.getAsyncMap(
				url,
				BinaryProto,
				this.lockFunction(url),
				noBlobStorage
			);
		})();

		const getItem			= async (key: string) => this.getItem(
			`${url}/${key}`,
			proto,
			securityModel,
			customKey,
			anonymous
		);

		const getValueHelper	= async (keys: string[]) => new Map<string, T>(
			await Promise.all(keys.map(async (key) : Promise<[string, T]> => [
				key,
				await getItem(key)
			]))
		);

		const usernamePromise	= this.getUsernameFromURL(url);

		/* See https://github.com/Microsoft/tslint-microsoft-contrib/issues/381 */
		/* tslint:disable-next-line:no-unnecessary-local-variable */
		const asyncMap: IAsyncMap<string, T>	= {
			clear: async () => (await baseAsyncMap).clear(),
			getItem,
			getKeys: async () => {
				const keys	= await this.getListKeys(url);

				if (securityModel === SecurityModels.publicFromOtherUsers) {
					const username	= await usernamePromise;
					return keys.filter(k => k !== username);
				}

				return keys;
			},
			getValue: async () => localLock(async () => getValueHelper(await asyncMap.getKeys())),
			hasItem: async key => (await baseAsyncMap).hasItem(key),
			lock: async (f, reason) => (await baseAsyncMap).lock(f, reason),
			removeItem: async key => (await baseAsyncMap).removeItem(key),
			setItem: async (key, value) => {
				await this.setItem(
					`${url}/${key}`,
					proto,
					value,
					securityModel,
					customKey,
					noBlobStorage
				);
			},
			setValue: async (mapValue: Map<string, T>) => localLock(async () => {
				await asyncMap.clear();
				await Promise.all(Array.from(mapValue.entries()).map(async ([key, value]) =>
					asyncMap.setItem(key, value)
				));
			}),
			size: async () => (await baseAsyncMap).size(),
			updateValue: async f => asyncMap.lock(async () =>
				asyncMap.setValue(await f(await asyncMap.getValue()))
			),
			watch: memoize(() => this.watchListKeys(url).pipe(mergeMap(getValueHelper))),
			watchSize: () => flattenObservable(async () => (await baseAsyncMap).watchSize())
		};

		return asyncMap;
	}

	/** @see DatabaseService.getAsyncValue */
	public getAsyncValue<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		blockGetValue: boolean = false,
		noBlobStorage: boolean = false
	) : IAsyncValue<T> {
		const defaultValue	= proto.create();
		const localLock		= lockFunction();

		const asyncValue	= (async () => {
			url	= await this.normalizeURL(url);

			return this.databaseService.getAsyncValue(
				url,
				BinaryProto,
				this.lockFunction(url),
				blockGetValue,
				noBlobStorage
			);
		})();

		const watch	= memoize(() =>
			this.watch(
				url,
				proto,
				securityModel,
				customKey,
				anonymous
			).pipe(map<ITimedValue<T>, T>(o => o.value))
		);

		return {
			getValue: async () => localLock(async () => {
				if (!anonymous) {
					await this.waitForUnlock(url);
				}
				return this.open(
					url,
					proto,
					securityModel,
					await (await asyncValue).getValue(),
					customKey,
					anonymous
				);
			}).catch(async () => blockGetValue ?
				watch().pipe(take(2)).toPromise() :
				defaultValue
			),
			lock: async (f, reason) =>
				(await asyncValue).lock(f, reason)
			,
			setValue: async value => localLock(async () => (await asyncValue).setValue(
				await this.seal(url, proto, value, securityModel, customKey)
			)),
			updateValue: async f => (await asyncValue).updateValue(async value => this.seal(
				url,
				proto,
				await f(
					await this.open(url, proto, securityModel, value, customKey).
						catch(() => defaultValue)
				),
				securityModel,
				customKey
			)),
			watch
		};
	}

	/** Keys and profile of currently logged in user. */
	public async getCurrentUser () : Promise<ICurrentUser> {
		const currentUser	=
			this.currentUser.value ||
			await this.currentUserFiltered.pipe(take(1)).toPromise()
		;

		if (!currentUser) {
			throw new Error('Cannot get current user.');
		}

		return currentUser;
	}

	/** @see DatabaseService.getItem */
	public async getItem<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false
	) : Promise<T> {
		return (
			await (
				await this.getItemInternal(url, proto, securityModel, customKey, anonymous)
			).result
		).value;
	}

	/** @see DatabaseService.getList */
	public async getList<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		immutable: boolean = true
	) : Promise<T[]> {
		url	= await this.normalizeURL(url);

		const [keys, head]	= await Promise.all([
			this.getListKeys(url),
			!immutable ? Promise.resolve(undefined) : this.getItemInternal(
				`${url}-head`,
				StringProto,
				securityModel,
				customKey,
				anonymous
			).then(({result}) =>
				result.value
			).catch(() =>
				undefined
			)
		]);

		return (await this.getListInternal(
			head,
			keys,
			url,
			proto,
			securityModel,
			customKey,
			anonymous,
			immutable
		)).map(o =>
			o.value
		);
	}

	/** @see DatabaseService.getListKeys */
	public async getListKeys (url: MaybePromise<string>) : Promise<string[]> {
		return this.databaseService.getListKeys(await this.normalizeURL(url));
	}

	/** @see DatabaseService.getOrSetDefault */
	public async getOrSetDefault<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		defaultValue: () => MaybePromise<T>
	) : Promise<T> {
		try {
			return await this.getItem(url, proto);
		}
		catch {
			const value	= await defaultValue();
			this.setItem(url, proto, value).catch(() => {});
			return value;
		}
	}

	/** Gets public keys belonging to the specified user. */
	public async getUserPublicKeys (username: string) : Promise<IAccountUserPublicKeys> {
		if (!username) {
			throw new Error('Invalid username.');
		}

		username	= normalize(username);

		return this.localStorageService.getOrSetDefault(
			`AccountDatabaseService.getUserPublicKeys/${username}`,
			AccountUserPublicKeys,
			async () => {
				const certBytes			= await this.databaseService.getItem(
					`users/${username}/certificate`,
					BinaryProto
				);

				const dataView			= this.potassiumService.toDataView(certBytes);
				const rsaKeyIndex		= dataView.getUint32(0, true);
				const sphincsKeyIndex	= dataView.getUint32(4, true);
				const signed			= this.potassiumService.toBytes(certBytes, 8);

				if (
					rsaKeyIndex >= this.agsePublicSigningKeys.rsa.length ||
					sphincsKeyIndex >= this.agsePublicSigningKeys.sphincs.length
				) {
					throw new Error('Invalid AGSE-PKI certificate: bad key index.');
				}

				const cert	= await deserialize(
					AGSEPKICert,
					await this.potassiumHelpers.sign.open(
						signed,
						await this.potassiumService.sign.importSuperSphincsPublicKeys(
							this.agsePublicSigningKeys.rsa[rsaKeyIndex],
							this.agsePublicSigningKeys.sphincs[sphincsKeyIndex]
						),
						username,
						false
					)
				);

				if (cert.agsePKICSR.username !== username) {
					throw new Error('Invalid AGSE-PKI certificate: bad username.');
				}

				const encryptionURL	= await this.normalizeURL(
					`users/${username}/publicEncryptionKey`
				);

				return {
					encryption: await this.potassiumHelpers.sign.open(
						await this.databaseService.getItem(encryptionURL, BinaryProto),
						cert.agsePKICSR.publicSigningKey,
						encryptionURL,
						true
					),
					signing: cert.agsePKICSR.publicSigningKey
				};
			}
		);
	}

	/** @see DatabaseService.hasItem */
	public async hasItem (url: MaybePromise<string>) : Promise<boolean> {
		return this.databaseService.hasItem(await this.normalizeURL(url));
	}

	/** @see DatabaseService.lock */
	public async lock<T> (
		url: MaybePromise<string>,
		f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
		reason?: string
	) : Promise<T> {
		const currentUser	= await this.getCurrentUser();
		url					= await this.processLockURL(url);

		return this.databaseService.lock(
			url,
			async o => {
				if (o.reason) {
					o.reason	= this.potassiumService.toString(
						await this.potassiumHelpers.secretBox.open(
							this.potassiumService.fromBase64(o.reason),
							currentUser.keys.symmetricKey,
							await url
						)
					);
				}

				return f(o);
			},
			!reason ?
				undefined :
				this.potassiumService.toBase64(
					await this.potassiumHelpers.secretBox.seal(
						this.potassiumService.fromString(reason),
						currentUser.keys.symmetricKey,
						url
					)
				)
		);
	}

	/** @see DatabaseService.lockFunction */
	public lockFunction (url: MaybePromise<string>) : LockFunction {
		return async <T> (
			f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
			reason?: string
		) =>
			this.lock(url, f, reason)
		;
	}

	/** @see DatabaseService.lockStatus */
	public async lockStatus (url: MaybePromise<string>) : Promise<{
		locked: boolean;
		reason: string|undefined;
	}> {
		const currentUser		= await this.getCurrentUser();
		url						= await this.processLockURL(url);
		const {locked, reason}	= await this.databaseService.lockStatus(url);

		return {
			locked,
			reason: !reason ?
				undefined :
				this.potassiumService.toString(
					await this.potassiumHelpers.secretBox.open(
						this.potassiumService.fromBase64(reason),
						currentUser.keys.symmetricKey,
						url
					)
				)
		};
	}

	/** Normalizes URL. */
	public async normalizeURL (url: MaybePromise<string>) : Promise<string> {
		url	= (await url).replace(/^\//, '');

		if (url.match(/^users/)) {
			return url;
		}

		const currentUser	= await this.getCurrentUser();
		return `users/${currentUser.user.username}/${url}`;
	}

	/** @see DatabaseService.notify */
	public async notify (
		username: MaybePromise<string>,
		notificationType: NotificationTypes,
		subType?: number
	) : Promise<void> {
		await this.databaseService.notify(
			await this.normalizeURL('notifications'),
			username,
			notificationType,
			subType
		);
	}

	/** @see DatabaseService.pushItem */
	public async pushItem<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		value: T,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		immutable: boolean = true,
		noBlobStorage: boolean = false
	) : Promise<{hash: string; url: string}> {
		url	= await this.normalizeURL(url);

		return this.databaseService.pushItem(
			url,
			BinaryProto,
			async (key, previousKey, o) => {
				if (immutable) {
					o.callback	= async () => this.setItem(
						`${url}-head`,
						StringProto,
						key,
						securityModel,
						customKey,
						noBlobStorage
					).then(
						() => {}
					);
				}

				return this.seal(
					`${url}/${key}`,
					proto,
					value,
					securityModel,
					customKey,
					immutable ? ((await previousKey()) || '') : undefined
				);
			},
			noBlobStorage
		);
	}

	/** @see DatabaseService.removeItem */
	public async removeItem (url: MaybePromise<string>) : Promise<void> {
		url	= await this.normalizeURL(url);

		return this.databaseService.removeItem(url);
	}

	/** @see DatabaseService.setItem */
	public async setItem<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		value: T,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		noBlobStorage: boolean = false
	) : Promise<{hash: string; url: string}> {
		return this.lock(url, async () => this.databaseService.setItem(
			await this.normalizeURL(url),
			BinaryProto,
			await this.seal(url, proto, value, securityModel, customKey),
			noBlobStorage
		));
	}

	/** @see DatabaseService.setList */
	public async setList<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		value: T[],
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		immutable: boolean = true,
		noBlobStorage: boolean = false
	) : Promise<void> {
		url	= await this.normalizeURL(url);

		return this.lock(url, async () => {
			await this.removeItem(url);
			for (const v of value) {
				await this.pushItem(
					url,
					proto,
					v,
					securityModel,
					customKey,
					immutable,
					noBlobStorage
				);
			}
		});
	}

	/**
	 * @see DatabaseService.subscribeAndPop
	 * Note: Can only be used with mutable lists. Decryption will fail otherwise.
	 */
	public subscribeAndPop<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		f: (value: T) => MaybePromise<void>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false
	) : Subscription {
		return this.watchListKeyPushes(url).subscribe(async ({key}) => {
			try {
				const fullURL	= `${url}/${key}`;
				await f(await this.getItem(fullURL, proto, securityModel, customKey, anonymous));
				await this.removeItem(fullURL);
			}
			catch {}
		});
	}

	/** @see DatabaseService.uploadItem */
	public uploadItem<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		value: T,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		noBlobStorage: boolean = false
	) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		const cancel	= resolvable();
		const progress	= new BehaviorSubject(0);

		const result	= (async () => {
			const uploadTask	= this.databaseService.uploadItem(
				await this.normalizeURL(url),
				BinaryProto,
				await this.seal(url, proto, value, securityModel, customKey),
				noBlobStorage
			);

			cancel.promise.then(() => { uploadTask.cancel(); });

			uploadTask.progress.subscribe(
				n => { progress.next(n); },
				err => { progress.error(err); },
				() => { progress.complete(); }
			);

			return uploadTask.result;
		})();

		return {cancel: cancel.resolve, progress, result};
	}

	/** @see DatabaseService.waitForUnlock */
	public async waitForUnlock (url: MaybePromise<string>) : Promise<{
		reason: string|undefined;
		wasLocked: boolean;
	}> {
		const currentUser			= await this.getCurrentUser();
		url							= await this.processLockURL(url);
		const {reason, wasLocked}	= await this.databaseService.waitForUnlock(url);

		return {
			reason: !reason ?
				undefined :
				this.potassiumService.toString(
					await this.potassiumHelpers.secretBox.open(
						this.potassiumService.fromBase64(reason),
						currentUser.keys.symmetricKey,
						url
					)
				)
			,
			wasLocked
		};
	}

	/** @see DatabaseService.watch */
	public watch<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false
	) : Observable<ITimedValue<T>> {
		return cacheObservable(
			this.watchCurrentUser(anonymous).pipe(
				mergeMap(async () => {
					const processedURL	= await this.normalizeURL(url);

					return this.databaseService.watch(
						processedURL,
						BinaryProto
					).pipe(mergeMap(async data => ({
						timestamp: data.timestamp,
						value: await this.open(
							processedURL,
							proto,
							securityModel,
							data.value,
							customKey,
							anonymous
						).catch(
							() => proto.create()
						)
					})));
				}),
				mergeMap(
					o => o
				)
			),
			{timestamp: NaN, value: proto.create()}
		);
	}

	/** Returns currentUser observable. */
	public watchCurrentUser (anonymous: boolean = false) : Observable<ICurrentUser|undefined> {
		return anonymous ? this.currentUser : this.currentUserFiltered;
	}

	/** @see DatabaseService.watchExists */
	public watchExists (url: MaybePromise<string>) : Observable<boolean> {
		return this.databaseService.watchExists(this.normalizeURL(url));
	}

	/** @see DatabaseService.watchList */
	public watchList<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		immutable: boolean = true
	) : Observable<ITimedValue<T>[]> {
		const cache: {head?: string; keys: number; value: ITimedValue<T>[]}	= {keys: 0, value: []};

		return cacheObservable(
			combineLatest(
				this.watchListKeys(url),
				!immutable ? of({timestamp: NaN, value: ''}) : this.watch(
					`${url}-head`,
					StringProto,
					securityModel,
					customKey,
					anonymous
				)
			).pipe(
				mergeMap(async ([keys, head]) => {
					const headValue	= !isNaN(head.timestamp) ? head.value : undefined;

					const getValue	= async () => this.getListInternal(
						headValue,
						keys,
						await this.normalizeURL(url),
						proto,
						securityModel,
						customKey,
						anonymous,
						immutable
					);

					if (!immutable) {
						return getValue();
					}
					if (headValue === undefined) {
						return [];
					}
					if (headValue !== cache.head) {
						cache.head	= headValue;
						cache.keys	= keys.length;
						cache.value	= await getValue();
					}

					return cache.value;
				})
			),
			[]
		);
	}

	/** @see DatabaseService.watchListKeyPushes */
	public watchListKeyPushes (url: MaybePromise<string>) : Observable<{
		key: string;
		previousKey?: string;
	}> {
		return this.currentUser.pipe(
			mergeMap(async () =>
				this.databaseService.watchListKeyPushes(await this.normalizeURL(url))
			),
			mergeMap(
				o => o
			)
		);
	}

	/** @see DatabaseService.watchListKeys */
	public watchListKeys (url: MaybePromise<string>) : Observable<string[]> {
		return cacheObservable(
			this.currentUser.pipe(
				mergeMap(async () =>
					this.databaseService.watchListKeys(await this.normalizeURL(url))
				),
				mergeMap(
					o => o
				)
			),
			[]
		);
	}

	/** @see DatabaseService.watchListPushes */
	public watchListPushes<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		immutable: boolean = true
	) : Observable<ITimedValue<T>> {
		return cacheObservable(
			this.watchCurrentUser(anonymous).pipe(
				mergeMap(async () => {
					const processedURL	= await this.normalizeURL(url);

					return this.databaseService.watchListPushes(
						processedURL,
						BinaryProto
					).pipe(mergeMap(async data => ({
						timestamp: data.timestamp,
						value: await this.open(
							`${processedURL}/${data.key}`,
							proto,
							securityModel,
							data.value,
							customKey,
							anonymous,
							immutable ? (data.previousKey || '') : undefined
						)
					})));
				}),
				mergeMap(
					o => o
				)
			),
			{timestamp: NaN, value: proto.create()}
		);
	}

	constructor (
		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
