/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {map} from 'rxjs/operators/map';
import {mergeMap} from 'rxjs/operators/mergeMap';
import {take} from 'rxjs/operators/take';
import {Subscription} from 'rxjs/Subscription';
import {ICurrentUser, SecurityModels} from '../../account';
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
	NotificationTypes
} from '../../proto';
import {filterUndefinedOperator} from '../../util/filter';
import {cacheObservable, flattenObservable} from '../../util/flatten-observable';
import {normalize} from '../../util/formatting';
import {lockFunction} from '../../util/lock';
import {deserialize, serialize} from '../../util/serialization';
import {resolvable, retryUntilSuccessful} from '../../util/wait';
import {DatabaseService} from '../database.service';
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

	/** Public keys for AGSE-PKI certificate validation. */
	private readonly agsePublicSigningKeys	= {
		rsa: [
			'eyJhbGciOiJSUzI1NiIsImUiOiJBUUFCIiwiZXh0Ijp0cnVlLCJrZXlfb3BzIjpbInZlcmlmeSJ' +
			'dLCJrdHkiOiJSU0EiLCJuIjoidkVUOG1HY24zcWFyN1FfaXo1MVZjUmNKdHRFSG5VcWNmN1VybT' +
			'Vueko4bG80Q2RjQTZLN2dRMDl6bmx4a3NQLTg1RE1NSGdwU29mcU1BY2l6UTVmNW5McGxydEtJX' +
			'0dtdFJ1T1k2d3RHZnZLcjNNX3pWMGxVYVFKSXEyVmg0aTU0ZHo1akp6QTZwWmp4eU91V01VdnJm' +
			'SXZrWVg5LUl2MTBxMTEwYm9waGNmRGpNVTFQbTNZeUlVQzhjSEk2TmN0ZGVOV3dzTEg2WkgwbVd' +
			'QYTgxZUw2bWtyVzBUZkt1Q1ZEaDBFckVCWkJJUUx5TmV1dF9jb2JxR0NoS0V6Y0xVMll6MUUwR1' +
			'9DbkRLVHVYVG5nNEVUQ0FYakhDUXJwaUp1aV81UG9SUGdhT0xvcEdKV0RmQXkxMF8yX3ZIeGxab' +
			'3hrNWFxREx2Z3B3Ny1fdHVTNWRzNmlRIn0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
		],
		sphincs: [
			'z3ztlxR0wvt9oW3zvjSF74ugJKbzCpJ0yHEeUdFiPIiBMZ3zcOu0N4M9adTCvdDQBefFNUSVeFFk' +
			'7lNUfAPNdIV63DMwYS2hPoSM0q1psU0o9ba0M/vrW51Qkkgh8+U4e0sGtHq3Nrb7Gp+KTo5OB7On' +
			'SAaudHT/hR3oSj85JdjZ0QhN4iHAJvhujUHceNbLJY/c50YSRlnG/12hc5yxeaslUCvYyYPcXneL' +
			'Kr3bINmeFkfr9/Lirxkr9AYiN3c4/s4D45MU1XpKY/u9Ar4zil+ejkIokTPVhwGZH6RoSI0j1WX/' +
			'1MxOIwTBafQ+vSiamDPik9c1nHZMh7Cr573IY0WePSi5qQuY6hbgyyq0qm8+FealryFZAqYQf2kd' +
			'T8RxzCSnQtQmiisLkqdi/glDiPxi5xs1jSBRUqBv+oaaQAYME2tHdzBqG2V6yz9olOLzzQLAsyhe' +
			'aoW9C45G4s5ws3eU4CipA3M/rVflgOXyXID8U5t+u+kE3Ncy3b6GSX92bumgqtoaUYRCCN4/TOAB' +
			'EpMTn/5dlugoyJVDxq986d+oQaGEFQfdkpBybaq9lQZQaUIqwTX26okpmLpvau3s+ENdo76ZxSkK' +
			'IG8HjP3P0SSLnS3u7aMvm4JW8lI7UG5t38M+5bS5XNUumJdWiWQf6Ay4dDBuaybu7roS8LgTvbfo' +
			'CLWEUkNT3LmCXYw//+nG6pB0W780ejV9TE0xIIRZ+XzQ8oFNTceJWsbGOgli5IBZh+40LL02TZC9' +
			'Eo/TFCSNtekG8I2NyZnfP+aeZvOvSW+I95onFjnkRd/KxntSobRTGBPLfJS/UaLAEMnyh9NoPIHi' +
			'6yUw5QVp7kYYY+slgT66g80GBVj5z1LxBpgsmWIKNnhqbf13qo24C3S+8rf8GAbdSdET9ObarpmA' +
			'IXjl9Nl7CWL+ZVfFvYrRkKzYHMGIYKnIzj/LHs3pn17yHW+AiN2SEpjUuSnd471+mOqwjmzvfsS4' +
			'HoN0ehv2cbhc1b+rHaO3thuwemHzS1w1AS9qHOPdFMZ+3wnsqDD16O+yPy5yF060xcdIJkryfMqJ' +
			'3I9lJfpd2HCLfaHSIYe+KEMJgUhieWahozYDiVX8Y3UVD8wTaC/rrkSq3tNh4k9Qh3qku+QQdzRj' +
			'/YOeX3tt57DSQEt0/GP3bwXDt1wlaIogeNW93VWXdVpLlt50fom9mf0yMcS4IuXT3qNiMRPjkbTo' +
			'TfODamHnu9vu/sd/4c6N3soJMJC7e+nIBJWqAgBczXMaTgUb2CsXTB92wf5syOLZNxQqjh073vkT' +
			'6vQwJ9qYu6ad0carC5esAfgiNY/7ayolQObwd/7wbGGYV1QFCJYs6NCjUTst/DH8KyI8Piw7aknq' +
			'uqxj7+blqIEewEPKEx1mBKgvDLzGgIoEx3azc/nk'
		]
	};

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
					anonymous
				)
			}
		};
	}

	/** @ignore */
	private async getListInternal<T> (
		keys: string[],
		url: string,
		proto: IProto<T>,
		securityModel: SecurityModels = SecurityModels.private,
		customKey?: MaybePromise<Uint8Array>,
		anonymous: boolean = false,
		immutable: boolean = true
	) : Promise<ITimedValue<T>[]> {
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
		immutable: boolean = true
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
				await this.pushItem(url, proto, value, securityModel, customKey, immutable);
			}),
			setValue: async value => localLock(async () =>
				this.setList(url, proto, value, securityModel, customKey, immutable)
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
		anonymous: boolean = false
	) : IAsyncMap<string, T> {
		const localLock			= lockFunction();

		const baseAsyncMap		= (async () => {
			url	= await this.normalizeURL(url);

			return this.databaseService.getAsyncMap(
				url,
				BinaryProto,
				this.lockFunction(url)
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
					customKey
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
		blockGetValue: boolean = false
	) : IAsyncValue<T> {
		const defaultValue	= proto.create();
		const localLock		= lockFunction();

		const asyncValue	= (async () => {
			url	= await this.normalizeURL(url);

			return this.databaseService.getAsyncValue(
				url,
				BinaryProto,
				this.lockFunction(url),
				blockGetValue
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

		return (await this.getListInternal(
			await this.getListKeys(url),
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
		f: (reason?: string) => Promise<T>,
		reason?: string
	) : Promise<T> {
		const currentUser	= await this.getCurrentUser();
		url					= await this.processLockURL(url);

		return this.databaseService.lock(
			url,
			async r => f(!r ?
				undefined :
				this.potassiumService.toString(
					await this.potassiumHelpers.secretBox.open(
						this.potassiumService.fromBase64(r),
						currentUser.keys.symmetricKey,
						await url
					)
				)
			),
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
		return async <T> (f: (reason?: string) => Promise<T>, reason?: string) =>
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
		immutable: boolean = true
	) : Promise<{hash: string; url: string}> {
		return this.databaseService.pushItem(
			await this.normalizeURL(url),
			BinaryProto,
			async (key, previousKey) => this.seal(
				`${url}/${key}`,
				proto,
				value,
				securityModel,
				customKey,
				immutable ? (previousKey || '') : undefined
			)
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
		customKey?: MaybePromise<Uint8Array>
	) : Promise<{hash: string; url: string}> {
		return this.lock(url, async () => this.databaseService.setItem(
			await this.normalizeURL(url),
			BinaryProto,
			await this.seal(url, proto, value, securityModel, customKey)
		));
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
		url	= await this.normalizeURL(url);

		return this.lock(url, async () => {
			await this.removeItem(url);
			for (const v of value) {
				await this.pushItem(url, proto, v, securityModel, customKey, immutable);
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
		customKey?: MaybePromise<Uint8Array>
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
				await this.seal(url, proto, value, securityModel, customKey)
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
		return cacheObservable(
			this.watchListKeys(url).pipe(
				mergeMap(async keys => this.getListInternal(
					keys,
					await this.normalizeURL(url),
					proto,
					securityModel,
					customKey,
					anonymous,
					immutable
				))
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
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
