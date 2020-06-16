/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {map, switchMap, take} from 'rxjs/operators';
import {ICurrentUser, publicSigningKeys, SecurityModels} from '../../account';
import {BaseProvider} from '../../base-provider';
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
	StringProto,
	TimedArrayProto
} from '../../proto';
import {filterUndefinedOperator} from '../../util/filter';
import {
	cacheObservable,
	flattenObservable,
	toBehaviorSubject
} from '../../util/flatten-observable';
import {normalize} from '../../util/formatting';
import {
	getOrSetDefault,
	getOrSetDefaultAsync
} from '../../util/get-or-set-default';
import {lockFunction} from '../../util/lock';
import {debugLog, debugLogError} from '../../util/log';
import {observableAll} from '../../util/observable-all';
import {flattenArray} from '../../util/reducers';
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
export class AccountDatabaseService extends BaseProvider {
	/** @ignore */
	private readonly agsePublicSigningKeys = this.envService.environment
		.useProdSigningKeys ?
		publicSigningKeys.prod :
		publicSigningKeys.test;

	/** @ignore */
	private readonly cache = {
		getAsyncList: new Map<any, any>(),
		getAsyncMap: new Map<any, any>(),
		getAsyncValue: new Map<any, any>(),
		list: {
			getItem: async <T>(
				url: MaybePromise<string>,
				proto: IProto<T>,
				immutable: boolean
			) : Promise<ITimedValue<T>[] | undefined> => {
				try {
					return await this.localStorageService.getItem(
						`AccountDatabaseService/listCache${
							immutable ? '-immutable' : ''
						}/${await this.normalizeURL(url, true)}`,
						new TimedArrayProto(proto)
					);
				}
				catch {
					return undefined;
				}
			},
			setItem: async <T>(
				url: MaybePromise<string>,
				proto: IProto<T>,
				immutable: boolean,
				list: ITimedValue<T>[]
			) =>
				this.localStorageService.setItem(
					`AccountDatabaseService/listCache${
						immutable ? '-immutable' : ''
					}/${await this.normalizeURL(url, true)}`,
					new TimedArrayProto(proto),
					list
				)
		}
	};

	/** @ignore */
	private readonly openHelpers = {
		secretBox: async (
			data: Uint8Array,
			url: string,
			customKey: MaybePromise<Uint8Array> | undefined
		) =>
			this.potassiumHelpers.secretBox.open(
				data,
				(await customKey) ||
					(await this.getCurrentUser()).keys.symmetricKey,
				url
			),
		sign: async (
			data: Uint8Array,
			url: string,
			decompress: boolean,
			usernameOther: boolean = false
		) => {
			const username = await this.getUsernameFromURL(url, usernameOther);

			return this.localStorageService.getOrSetDefault(
				`AccountDatabaseService.open/${username}/${this.potassiumService.toBase64(
					await this.potassiumService.hash.hash(data)
				)}`,
				BinaryProto,
				async () =>
					this.potassiumHelpers.sign.open(
						data,
						this.currentUser.value &&
							username === this.currentUser.value.user.username ?
							this.currentUser.value.keys.signingKeyPair
								.publicKey :
							(await this.getUserPublicKeys(username)).signing,
						url,
						decompress
					)
			);
		}
	};

	/** @ignore */
	private readonly potassiumHelpers = {
		secretBox: {
			open: async (
				cyphertext: Uint8Array,
				key: Uint8Array,
				additionalData: string
			) : Promise<Uint8Array> =>
				this.potassiumService.secretBox.open(
					cyphertext,
					key,
					`${this.databaseService.namespace}:${additionalData}`
				),
			seal: async (
				plaintext: Uint8Array,
				key: Uint8Array,
				additionalData: string
			) : Promise<Uint8Array> =>
				this.potassiumService.secretBox.seal(
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
			) : Promise<Uint8Array> =>
				this.potassiumService.sign.open(
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
			) : Promise<Uint8Array> =>
				this.potassiumService.sign.sign(
					message,
					privateKey,
					`${this.databaseService.namespace}:${additionalData}`,
					compress
				)
		}
	};

	/** @ignore */
	private readonly sealHelpers = {
		secretBox: async (
			data: Uint8Array,
			url: string,
			customKey: MaybePromise<Uint8Array> | undefined
		) =>
			retryUntilSuccessful(async () =>
				this.potassiumHelpers.secretBox.seal(
					data,
					(await customKey) ||
						(await this.getCurrentUser()).keys.symmetricKey,
					url
				)
			),
		sign: async (data: Uint8Array, url: string, compress: boolean) =>
			retryUntilSuccessful(async () =>
				this.potassiumHelpers.sign.sign(
					data,
					(await this.getCurrentUser()).keys.signingKeyPair
						.privateKey,
					url,
					compress
				)
			)
	};

	/** @see getCurrentUser */
	public readonly currentUser: BehaviorSubject<
		ICurrentUser | undefined
	> = new BehaviorSubject<ICurrentUser | undefined>(undefined);

	/** @see getCurrentUser */
	public readonly currentUserFiltered: Observable<
		ICurrentUser
	> = this.currentUser.pipe(filterUndefinedOperator<ICurrentUser>());

	/** Database namespace + a random 64-byte string, used for verification purposes. */
	public readonly verificationString = `${this.databaseService.namespace}:DQPcViq0Fmr8NZ1NTqyEFFjvUqqcplaGdE2rqjYOercYO/t1/CxBY0cRohegDPf/gqhUJmZ58YMzogCIT2zScA==`;

	/** @ignore */
	private async getItemInternal<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels,
		customKey: MaybePromise<Uint8Array> | undefined,
		anonymous: boolean = false,
		moreAdditionalData?: string
	) : Promise<{
		alreadyCached: boolean;
		progress: Observable<number>;
		result: ITimedValue<T>;
	}> {
		url = await url;

		if (!anonymous && this.currentUser.value) {
			url = await this.normalizeURL(url);
		}

		const downloadTask = this.databaseService.downloadItem(
			url,
			BinaryProto
		);

		const [alreadyCached, timestamp, value] = await Promise.all([
			downloadTask.alreadyCached,
			downloadTask.result.then(o => o.timestamp),
			downloadTask.result.then(async o =>
				this.open(
					url,
					proto,
					securityModel,
					o.value,
					customKey,
					anonymous,
					moreAdditionalData
				)
			)
		]);

		return {
			alreadyCached,
			progress: downloadTask.progress,
			result: {
				timestamp,
				value
			}
		};
	}

	/** @ignore */
	private async getListInternal<T> (
		head: string | undefined,
		keys: string[],
		url: string,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		immutable: boolean = true
	) : Promise<ITimedValue<T>[]> {
		if (head !== undefined) {
			keys = keys.slice(0, keys.lastIndexOf(head) + 1);
		}
		else if (immutable) {
			return [];
		}

		const lastValue =
			(await this.cache.list.getItem(url, proto, immutable)) || [];

		if (keys.length === lastValue.length) {
			return lastValue;
		}

		const list = await Promise.all(
			keys.map(
				async (k, i) =>
					lastValue[i] ||
					(await this.getItemInternal(
						`${url}/${k}`,
						proto,
						securityModel,
						customKey,
						anonymous,
						!immutable ? undefined : i > 0 ? keys[i - 1] : ''
					)).result
			)
		);

		await this.cache.list.setItem(url, proto, immutable, list);

		return list;
	}

	/** @ignore */
	private async getUsernameFromURL (
		url: MaybePromise<string>,
		other: boolean = false
	) : Promise<string> {
		url = await url;

		return !other ?
			(url.match(/\/?users\/(.*?)\//) || [])[1] || '' :
			(url.match(/\/?users\/.*\/([^\/]+)$/) || [])[1] || '';
	}

	/** @ignore */
	private async open<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels,
		data: Uint8Array,
		customKey: MaybePromise<Uint8Array> | undefined,
		anonymous: boolean = false,
		moreAdditionalData?: string
	) : Promise<T> {
		url = await url;
		url =
			moreAdditionalData !== undefined ?
				`${url}?${moreAdditionalData}` :
				url;

		const currentUser = anonymous ? undefined : await this.getCurrentUser();

		return deserialize(
			proto,
			await (async () => {
				if (securityModel === SecurityModels.public) {
					return this.openHelpers.sign(data, url, true);
				}
				if (securityModel === SecurityModels.publicFromOtherUsers) {
					return this.openHelpers.sign(data, url, true, true);
				}
				if (securityModel === SecurityModels.unprotected) {
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
							await this.openHelpers.secretBox(
								data,
								url,
								customKey
							),
							url,
							false
						);

					default:
						throw new Error('Invalid security model.');
				}
			})()
		);
	}

	/** @ignore */
	private async processLockURL (url: MaybePromise<string>) : Promise<string> {
		const currentUser = await this.getCurrentUser();

		debugLog(async () => ({
			accountLockURL: await this.normalizeURL(url, true)
		}));

		return (
			`users/${currentUser.user.username}/locks/` +
			this.potassiumService.toHex(
				await this.potassiumService.hash.hash(
					(await this.normalizeURL(url, true)).replace(
						`users/${currentUser.user.username}/`,
						''
					)
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
		customKey: MaybePromise<Uint8Array> | undefined,
		moreAdditionalData?: string
	) : Promise<Uint8Array> {
		url = await this.normalizeURL(url, true);
		url =
			moreAdditionalData !== undefined ?
				`${url}?${moreAdditionalData}` :
				url;
		const data = await serialize(proto, value);

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

	/** @ignore */
	private async setItemInternal<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		value: T,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>
	) : Promise<{hash: string; url: string}> {
		return this.databaseService.setItem(
			await this.normalizeURL(url),
			BinaryProto,
			await this.seal(url, proto, value, securityModel, customKey)
		);
	}

	/** @see DatabaseService.callFunction */
	public async callFunction (
		name: string,
		data?: Record<string, any>
	) : Promise<any> {
		return this.databaseService.callFunction(name, data);
	}

	/** @see DatabaseService.downloadItem */
	public downloadItem<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false
	) : {
		alreadyCached: Promise<boolean>;
		progress: Observable<number>;
		result: Promise<ITimedValue<T>>;
	} {
		const progress = new BehaviorSubject(0);

		for (const maybePromise of <any[]> [url, customKey]) {
			if (maybePromise instanceof Promise) {
				maybePromise.catch(() => {});
			}
		}

		const downloadTaskResult = (async () => {
			const downloadTask = await this.getItemInternal(
				url,
				proto,
				securityModel,
				customKey,
				anonymous
			);

			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			downloadTask.progress.subscribe(
				n => {
					progress.next(n);
				},
				err => {
					progress.error(err);
				},
				() => {
					progress.complete();
				}
			);

			return downloadTask;
		})();

		return {
			alreadyCached: downloadTaskResult.then(o => o.alreadyCached),
			progress,
			result: downloadTaskResult.then(o => o.result)
		};
	}

	/** @see DatabaseService.getAsyncList */
	public getAsyncList<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		immutable: boolean = true,
		subscriptions?: Subscription[]
	) : IAsyncList<T> {
		const getAsyncList = () : IAsyncList<T> => {
			const localLock = lockFunction();

			/* See https://github.com/Microsoft/tslint-microsoft-contrib/issues/381 */
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			const asyncList: IAsyncList<T> = {
				clear: async () => localLock(async () => this.removeItem(url)),
				getFlatValue: async () =>
					<any> flattenArray(await asyncList.getValue()),
				getTimedValue: async () =>
					localLock(async () =>
						this.getListWithTimestamps(
							url,
							proto,
							securityModel,
							customKey,
							anonymous,
							immutable
						)
					),
				getValue: async () =>
					localLock(async () =>
						this.getList(
							url,
							proto,
							securityModel,
							customKey,
							anonymous,
							immutable
						)
					),
				lock: async (f, reason) => this.lock(url, f, reason),
				pushItem: async value =>
					localLock(async () => {
						await this.pushItem(
							url,
							proto,
							value,
							securityModel,
							customKey,
							immutable
						);
					}),
				setValue: async value =>
					localLock(async () =>
						this.setList(
							url,
							proto,
							value,
							securityModel,
							customKey,
							immutable
						)
					),
				subscribeAndPop: f => {
					if (immutable) {
						throw new Error(
							'Cannot subscribeAndPop immutable list.'
						);
					}

					return this.subscribeAndPop(
						url,
						proto,
						f,
						securityModel,
						customKey,
						anonymous,
						subscriptions
					);
				},
				updateValue: async f =>
					asyncList.setValue(await f(await asyncList.getValue())),
				watch: memoize(() =>
					this.watchList(
						url,
						proto,
						securityModel,
						customKey,
						anonymous,
						immutable,
						subscriptions
					).pipe(
						map<ITimedValue<T>[], T[]>(arr => arr.map(o => o.value))
					)
				),
				watchFlat: memoize((omitDuplicates?: boolean) =>
					asyncList
						.watch()
						.pipe<any>(
							map(arr => flattenArray(arr, omitDuplicates))
						)
				),
				watchPushes: memoize(() =>
					this.watchListPushes(
						url,
						proto,
						securityModel,
						customKey,
						anonymous,
						immutable,
						subscriptions
					).pipe(map<ITimedValue<T>, T>(o => o.value))
				)
			};

			return asyncList;
		};

		return typeof url === 'string' && customKey === undefined ?
			getOrSetDefault(this.cache.getAsyncList, url, getAsyncList) :
			getAsyncList();
	}

	/** @see DatabaseService.getAsyncMap */
	public getAsyncMap<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		staticValues: boolean = false,
		subscriptions?: Subscription[]
	) : IAsyncMap<string, T> {
		const getAsyncMap = () : IAsyncMap<string, T> => {
			const localLock = lockFunction();
			const itemCache = staticValues ? new Map<string, T>() : undefined;
			const method = 'AccountDatabaseService.getAsyncMap';

			const baseAsyncMap = (async () => {
				url = await this.normalizeURL(url);

				return this.databaseService.getAsyncMap(
					url,
					BinaryProto,
					k => this.lockFunction(k),
					staticValues,
					subscriptions
				);
			})();

			const getItemInternal = async (key: string) => {
				const f = async () =>
					(await this.getItemInternal(
						`${await url}/${key}`,
						proto,
						securityModel,
						customKey,
						anonymous
					)).result.value;

				if (!staticValues) {
					return f();
				}

				return getOrSetDefaultAsync(itemCache, key, f);
			};

			const getItem = staticValues ?
				async (key: string) =>
					this.localStorageService.getOrSetDefault(
						`${method}/${await url}/${key}`,
						proto,
						async () => getItemInternal(key)
					) :
				async (key: string) => getItemInternal(key);

			const getValueHelper = async (keys: string[]) =>
				new Map<string, T>(
					await Promise.all(
						keys.map(
							async (key) : Promise<[string, T]> => [
								key,
								await getItem(key)
							]
						)
					)
				);

			const removeItemInternal = async (key: string) => {
				if (itemCache) {
					itemCache.delete(key);
				}

				await Promise.all([
					this.removeItem(`${await url}/${key}`),
					staticValues ?
						this.localStorageService.removeItem(
							`${method}/${await url}/${key}`
						) :
						undefined
				]);
			};

			const setItemInternal = async (key: string, value: T) => {
				if (itemCache) {
					itemCache.set(key, value);
				}

				await Promise.all<any>([
					this.setItemInternal(
						`${await url}/${key}`,
						proto,
						value,
						securityModel,
						customKey
					),
					staticValues ?
						this.localStorageService.setItem(
							`${method}/${await url}/${key}`,
							proto,
							value
						) :
						undefined
				]);
			};

			const usernamePromise = this.getUsernameFromURL(url);

			/* See https://github.com/Microsoft/tslint-microsoft-contrib/issues/381 */
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			const asyncMap: IAsyncMap<string, T> = {
				clear: async () => (await baseAsyncMap).clear(),
				getItem,
				getKeys: async () => {
					const keys = await this.getListKeys(url);

					if (securityModel === SecurityModels.publicFromOtherUsers) {
						const username = await usernamePromise;
						return keys.filter(k => k !== username);
					}

					return keys;
				},
				getValue: async () =>
					localLock(async () =>
						getValueHelper(await asyncMap.getKeys())
					),
				hasItem: async key => (await baseAsyncMap).hasItem(key),
				lock: async (f, reason) => (await baseAsyncMap).lock(f, reason),
				removeItem: async key => removeItemInternal(key),
				setItem: async (key, value) => setItemInternal(key, value),
				setValue: async mapValue =>
					localLock(async () => {
						await asyncMap.clear();
						await Promise.all(
							Array.from(
								mapValue.entries()
							).map(async ([key, value]) =>
								asyncMap.setItem(key, value)
							)
						);
					}),
				size: async () => (await baseAsyncMap).size(),
				updateItem: async (key, f) => {
					const value = await getItemInternal(key).catch(
						() => undefined
					);
					let newValue: T | undefined;
					try {
						newValue = await f(value);
					}
					catch {
						return;
					}
					if (newValue === undefined) {
						await removeItemInternal(key);
					}
					else {
						await setItemInternal(key, newValue);
					}
				},
				updateValue: async f =>
					asyncMap.setValue(await f(await asyncMap.getValue())),
				watch: memoize(() =>
					this.watchListKeys(url, subscriptions).pipe(
						switchMap(getValueHelper)
					)
				),
				watchItem: memoize(key =>
					this.watch(
						Promise.resolve(url).then(s => `${s}/${key}`),
						proto,
						securityModel,
						customKey,
						anonymous,
						subscriptions
					).pipe(map(o => o.value))
				),
				watchKeys: () =>
					flattenObservable<string[]>(async () =>
						(await baseAsyncMap).watchKeys()
					),
				watchSize: () =>
					flattenObservable<number>(async () =>
						(await baseAsyncMap).watchSize()
					)
			};

			return asyncMap;
		};

		return typeof url === 'string' && customKey === undefined ?
			getOrSetDefault(this.cache.getAsyncMap, url, getAsyncMap) :
			getAsyncMap();
	}

	/** @see DatabaseService.getAsyncValue */
	public getAsyncValue<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		blockGetValue: boolean = false,
		subscriptions?: Subscription[]
	) : IAsyncValue<T> {
		const getAsyncValue = () : IAsyncValue<T> => {
			const localLock = lockFunction();

			const asyncValue = (async () => {
				url = await this.normalizeURL(url);

				return this.databaseService.getAsyncValue(
					url,
					BinaryProto,
					k => this.lockFunction(k),
					blockGetValue,
					subscriptions
				);
			})();

			const watch = memoize(() =>
				this.watch(
					url,
					proto,
					securityModel,
					customKey,
					anonymous,
					subscriptions
				).pipe(map<ITimedValue<T>, T>(o => o.value))
			);

			return {
				getValue: async () =>
					localLock(async () => {
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
					}).catch(async () =>
						blockGetValue ?
							watch()
								.pipe(take(2))
								.toPromise() :
							proto.create()
					),
				lock: async (f, reason) => (await asyncValue).lock(f, reason),
				setValue: async value =>
					localLock(async () =>
						(await asyncValue).setValue(
							await this.seal(
								url,
								proto,
								value,
								securityModel,
								customKey
							)
						)
					),
				updateValue: async f =>
					(await asyncValue).updateValue(async value =>
						this.seal(
							url,
							proto,
							await f(
								await this.open(
									url,
									proto,
									securityModel,
									value,
									customKey
								).catch(() => proto.create())
							),
							securityModel,
							customKey
						)
					),
				watch
			};
		};

		return typeof url === 'string' && customKey === undefined ?
			getOrSetDefault(this.cache.getAsyncValue, url, getAsyncValue) :
			getAsyncValue();
	}

	/** Keys and profile of currently logged in user. */
	public async getCurrentUser () : Promise<ICurrentUser> {
		const currentUser =
			this.currentUser.value ||
			(await this.currentUserFiltered.pipe(take(1)).toPromise());

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
		return (await this.getItemInternal(
			url,
			proto,
			securityModel,
			customKey,
			anonymous
		)).result.value;
	}

	/** @see DatabaseService.getLatestKey */
	public async getLatestKey (
		url: MaybePromise<string>
	) : Promise<string | undefined> {
		return this.databaseService.getLatestKey(this.normalizeURL(url));
	}

	/** @see DatabaseService.getList */
	public async getList<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel?: SecurityModels,
		customKey?: MaybePromise<Uint8Array>,
		anonymous?: boolean,
		immutable?: boolean
	) : Promise<T[]> {
		return (await this.getListWithTimestamps(
			url,
			proto,
			securityModel,
			customKey,
			anonymous,
			immutable
		)).map(o => o.value);
	}

	/** @see DatabaseService.getListKeys */
	public async getListKeys (
		url: MaybePromise<string>,
		noFilter: boolean = false
	) : Promise<string[]> {
		return this.databaseService.getListKeys(
			await this.normalizeURL(url),
			noFilter
		);
	}

	/** Gets list of ITimedValues. */
	public async getListWithTimestamps<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		immutable: boolean = true
	) : Promise<ITimedValue<T>[]> {
		url = await this.normalizeURL(url);

		const [keys, head] = await Promise.all([
			this.getListKeys(url),
			!immutable ?
				Promise.resolve(undefined) :
				this.getItemInternal(
					`${url}-head`,
					StringProto,
					securityModel,
					customKey,
					anonymous
				)
					.then(({result}) => result.value)
					.catch(() => undefined)
		]);

		return this.getListInternal(
			head,
			keys,
			url,
			proto,
			securityModel,
			customKey,
			anonymous,
			immutable
		);
	}

	/** Gets a value and sets a default value if none had previously been set. */
	public async getOrSetDefault<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		defaultValue: () => MaybePromise<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		staticValue: boolean = false
	) : Promise<T> {
		const f = async () => {
			try {
				return await this.getItem(url, proto, securityModel, customKey);
			}
			catch {
				const value = await defaultValue();
				await this.setItem(
					url,
					proto,
					value,
					securityModel,
					customKey
				).catch(() => {});
				return value;
			}
		};

		if (!staticValue) {
			return f();
		}

		return this.localStorageService.getOrSetDefault(
			`AccountDatabaseService.getOrSetDefault: ${await url}`,
			proto,
			f
		);
	}

	/** Gets public keys belonging to the specified user. */
	public async getUserPublicKeys (
		username: string
	) : Promise<IAccountUserPublicKeys> {
		if (!username) {
			throw new Error('Invalid username.');
		}

		username = normalize(username);

		return this.localStorageService.getOrSetDefault(
			`AccountDatabaseService.getUserPublicKeys/${username}`,
			AccountUserPublicKeys,
			async () => {
				const certBytes = await this.databaseService.getItem(
					`users/${username}/certificate`,
					BinaryProto
				);

				const dataView = this.potassiumService.toDataView(certBytes);
				const rsaKeyIndex = dataView.getUint32(0, true);
				const sphincsKeyIndex = dataView.getUint32(4, true);
				const signed = this.potassiumService.toBytes(certBytes, 8);

				if (
					rsaKeyIndex >= this.agsePublicSigningKeys.rsa.length ||
					sphincsKeyIndex >= this.agsePublicSigningKeys.sphincs.length
				) {
					throw new Error(
						'Invalid AGSE-PKI certificate: bad key index.'
					);
				}

				const cert = await deserialize(
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
					throw new Error(
						'Invalid AGSE-PKI certificate: bad username.'
					);
				}

				const encryptionURL = await this.normalizeURL(
					`users/${username}/publicEncryptionKey`,
					true
				);

				return {
					encryption: await this.potassiumHelpers.sign.open(
						await this.databaseService.getItem(
							encryptionURL,
							BinaryProto
						),
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

	/** @see DatabaseService.isCached */
	public async isCached (url: MaybePromise<string>) : Promise<boolean> {
		return this.databaseService.isCached(await this.normalizeURL(url));
	}

	/** @see DatabaseService.lock */
	public async lock<T> (
		url: MaybePromise<string>,
		f: (o: {
			reason?: string;
			stillOwner: BehaviorSubject<boolean>;
		}) => Promise<T>,
		reason?: string
	) : Promise<T> {
		const currentUser = await this.getCurrentUser();
		url = await this.processLockURL(url);

		return this.databaseService.lock(
			url,
			async o => {
				if (o.reason) {
					o.reason = this.potassiumService.toString(
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
				),
			false
		);
	}

	/** @see DatabaseService.lockFunction */
	public lockFunction (url: MaybePromise<string>) : LockFunction {
		return async <T>(
			f: (o: {
				reason?: string;
				stillOwner: BehaviorSubject<boolean>;
			}) => Promise<T>,
			reason?: string
		) => this.lock(url, f, reason);
	}

	/** @see DatabaseService.lockStatus */
	public async lockStatus (
		url: MaybePromise<string>
	) : Promise<{
		locked: boolean;
		reason: string | undefined;
	}> {
		const currentUser = await this.getCurrentUser();
		url = await this.processLockURL(url);
		const {locked, reason} = await this.databaseService.lockStatus(url);

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
	public async normalizeURL (
		url: MaybePromise<string>,
		stripRoot: boolean = false
	) : Promise<string> {
		url = (await url).replace(/^\//, '');

		if (url.match(/^root\//)) {
			return stripRoot ? url.slice(5) : url;
		}
		if (url.match(/^users\//)) {
			return url;
		}

		const currentUser = await this.getCurrentUser();
		return `users/${currentUser.user.username}/${url}`;
	}

	/** Triggers a push notification. */
	public async notify (
		username: MaybePromise<string | string[]>,
		notificationType: NotificationTypes,
		metadata?: {id: string} & Record<string, any>
	) : Promise<void> {
		await this.callFunction('userNotify', {
			target: await username,
			type: notificationType,
			...(metadata ? {metadata} : {})
		}).catch(err => {
			debugLogError(() => err);
		});
	}

	/** @see DatabaseService.pushItem */
	public async pushItem<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		value: T,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		immutable: boolean = true
	) : Promise<{hash: string; url: string}> {
		url = await this.normalizeURL(url);

		return this.databaseService.pushItem(
			url,
			BinaryProto,
			async (key, previousKey, o) => {
				if (immutable) {
					o.callback = async () =>
						this.setItem(
							`${await url}-head`,
							StringProto,
							key,
							securityModel,
							customKey
						).then(() => {});
				}

				return this.seal(
					`${await url}/${key}`,
					proto,
					value,
					securityModel,
					customKey,
					immutable ? (await previousKey()) || '' : undefined
				);
			}
		);
	}

	/** @see DatabaseService.pushNotificationsSubscribe */
	public async pushNotificationsSubscribe (
		callback: string | ((data: any) => void),
		callbackFunction?: (data: any) => void
	) : Promise<void> {
		return this.databaseService.pushNotificationsSubscribe(
			callback,
			callbackFunction
		);
	}

	/** @see DatabaseService.removeItem */
	public async removeItem (url: MaybePromise<string>) : Promise<void> {
		url = await this.normalizeURL(url);

		return this.databaseService.removeItem(url);
	}

	/** @see DatabaseService.setItem */
	public async setItem<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		value: T,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>
	) : Promise<{hash: string; url: string}> {
		return this.setItemInternal(
			url,
			proto,
			value,
			securityModel,
			customKey
		);
	}

	/** @see DatabaseService.setList */
	public async setList<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		value: T[],
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		immutable: boolean = true
	) : Promise<void> {
		url = await this.normalizeURL(url);

		return this.lock(url, async () => {
			await this.removeItem(url);
			for (const v of value) {
				await this.pushItem(
					url,
					proto,
					v,
					securityModel,
					customKey,
					immutable
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
		anonymous: boolean = false,
		subscriptions?: Subscription[]
	) : Subscription {
		const lock = lockFunction();

		return this.watchListKeyPushes(url, subscriptions).subscribe(
			async ({key}) => {
				const fullURL = Promise.resolve(url).then(s => `${s}/${key}`);

				const promise = this.getItem(
					fullURL,
					proto,
					securityModel,
					customKey,
					anonymous
				).then(f);

				await lock(async () => {
					try {
						await promise;
						await this.removeItem(fullURL);
					}
					catch (err) {
						debugLog(() => ({
							accountDatabaseSubscribeAndPopError: err
						}));
					}
				});
			}
		);
	}

	/** @see DatabaseService.uploadItem */
	public uploadItem<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		value: T,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>
	) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		const cancel = resolvable();
		const progress = new BehaviorSubject(0);

		const result = (async () => {
			const uploadTask = this.databaseService.uploadItem(
				await this.normalizeURL(url),
				BinaryProto,
				await this.seal(url, proto, value, securityModel, customKey)
			);

			cancel.promise.then(() => {
				uploadTask.cancel();
			});

			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			uploadTask.progress.subscribe(
				n => {
					progress.next(n);
				},
				err => {
					progress.error(err);
				},
				() => {
					progress.complete();
				}
			);

			return uploadTask.result;
		})();

		return {cancel: cancel.resolve, progress, result};
	}

	/** @see DatabaseService.waitForUnlock */
	public async waitForUnlock (
		url: MaybePromise<string>
	) : Promise<{
		reason: string | undefined;
		wasLocked: boolean;
	}> {
		const currentUser = await this.getCurrentUser();
		url = await this.processLockURL(url);
		const {reason, wasLocked} = await this.databaseService.waitForUnlock(
			url
		);

		return {
			reason: !reason ?
				undefined :
				this.potassiumService.toString(
					await this.potassiumHelpers.secretBox.open(
						this.potassiumService.fromBase64(reason),
						currentUser.keys.symmetricKey,
						url
					)
				),
			wasLocked
		};
	}

	/** @see DatabaseService.watch */
	public watch<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		subscriptions?: Subscription[]
	) : Observable<ITimedValue<T>> {
		return cacheObservable(
			this.watchCurrentUser(anonymous).pipe(
				switchMap(async () => {
					const processedURL = await this.normalizeURL(url);

					return this.databaseService
						.watch(processedURL, BinaryProto, subscriptions)
						.pipe(
							switchMap(async data => ({
								timestamp: data.timestamp,
								value: await this.open(
									processedURL,
									proto,
									securityModel,
									data.value,
									customKey,
									anonymous
								).catch(() => proto.create())
							}))
						);
				}),
				switchMap(o => o)
			),
			subscriptions
		);
	}

	/** Returns currentUser observable. */
	public watchCurrentUser (
		anonymous: boolean = false
	) : Observable<ICurrentUser | undefined> {
		return anonymous ? this.currentUser : this.currentUserFiltered;
	}

	/** @see DatabaseService.watchExists */
	public watchExists (
		url: MaybePromise<string>,
		subscriptions?: Subscription[]
	) : Observable<boolean> {
		return this.databaseService.watchExists(
			this.normalizeURL(url),
			subscriptions
		);
	}

	/** @see DatabaseService.watchList */
	public watchList<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		immutable: boolean = true,
		subscriptions?: Subscription[]
	) : Observable<ITimedValue<T>[]> {
		const lastValue = this.cache.list.getItem(url, proto, immutable);

		const cache: {head?: string; keys: number; value: ITimedValue<T>[]} = {
			keys: 0,
			value: []
		};

		const keysWatcher = () => this.watchListKeys(url, subscriptions);
		const headWatcher = () =>
			this.watch(
				(async () => `${await url}-head`)(),
				StringProto,
				securityModel,
				customKey,
				anonymous,
				subscriptions
			);

		const watcher = immutable ?
			headWatcher().pipe(
				switchMap(
					async (head) : Promise<[string[], ITimedValue<string>]> => [
						await this.getListKeys(url),
						head
					]
				)
			) :
			keysWatcher().pipe(
				map((keys) : [string[], ITimedValue<string>] => [
					keys,
					{timestamp: NaN, value: ''}
				])
			);

		return toBehaviorSubject(
			watcher.pipe(
				switchMap(async ([keys, head]) => {
					const headValue = !isNaN(head.timestamp) ?
						head.value :
						undefined;

					const getValue = async () =>
						this.getListInternal(
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
						cache.head = headValue;
						cache.keys = keys.length;
						cache.value = await getValue();
					}

					return cache.value;
				})
			),
			undefined,
			subscriptions,
			lastValue
		).pipe(filterUndefinedOperator());
	}

	/** @see DatabaseService.watchListKeyPushes */
	public watchListKeyPushes (
		url: MaybePromise<string>,
		subscriptions?: Subscription[]
	) : Observable<{
		key: string;
		previousKey?: string;
	}> {
		return this.currentUser.pipe(
			switchMap(async () =>
				this.databaseService.watchListKeyPushes(
					await this.normalizeURL(url),
					subscriptions
				)
			),
			switchMap(o => o)
		);
	}

	/** @see DatabaseService.watchListKeys */
	public watchListKeys (
		url: MaybePromise<string>,
		subscriptions?: Subscription[],
		noFilter: boolean = false
	) : Observable<string[]> {
		return cacheObservable(
			this.currentUser.pipe(
				switchMap(async () =>
					this.databaseService.watchListKeys(
						await this.normalizeURL(url),
						subscriptions,
						noFilter
					)
				),
				switchMap(o => o)
			),
			subscriptions
		);
	}

	/** @see DatabaseService.watchListPushes */
	public watchListPushes<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		immutable: boolean = true,
		subscriptions?: Subscription[]
	) : Observable<ITimedValue<T>> {
		return cacheObservable(
			this.watchCurrentUser(anonymous).pipe(
				switchMap(async () => {
					const processedURL = await this.normalizeURL(url);

					return this.databaseService
						.watchListPushes(
							processedURL,
							BinaryProto,
							undefined,
							undefined,
							subscriptions
						)
						.pipe(
							switchMap(async data => ({
								timestamp: data.timestamp,
								value: await this.open(
									`${processedURL}/${data.key}`,
									proto,
									securityModel,
									data.value,
									customKey,
									anonymous,
									immutable ?
										data.previousKey || '' :
										undefined
								)
							}))
						);
				}),
				switchMap(o => o)
			),
			subscriptions
		);
	}

	/** Watches list with keys. */
	public watchListWithKeys<T> (
		url: MaybePromise<string>,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		subscriptions?: Subscription[]
	) : Observable<{id: string; value: T}[]> {
		return this.watchListKeys(url, subscriptions).pipe(
			switchMap(keys =>
				observableAll(
					keys.map(id =>
						this.watch(
							Promise.resolve(url).then(s => `${s}/${id}`),
							proto,
							securityModel,
							customKey,
							anonymous,
							subscriptions
						).pipe(map(o => ({id, value: o.value})))
					)
				)
			)
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
	) {
		super();
	}
}
