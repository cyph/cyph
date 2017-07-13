/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import {memoize} from 'lodash';
import {BehaviorSubject, Observable} from 'rxjs';
import {AGSEPKICert, IAGSEPKICert} from '../../../proto';
import {ICurrentUser} from '../../account';
import {IAsyncValue} from '../../iasync-value';
import {IProto} from '../../iproto';
import {ITimedValue} from '../../itimed-value';
import {LockFunction} from '../../lock-function-type';
import {BinaryProto} from '../../protos';
import {util} from '../../util';
import {DatabaseService} from '../database.service';
import {PotassiumService} from './potassium.service';


/**
 * Account database service.
 * Setting public data signs it and getting public data verifies it.
 * Setting private data encrypts it and getting private data decrypts it.
 */
@Injectable()
export class AccountDatabaseService {
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

	/** @see getCurrentUser */
	public readonly currentUser: BehaviorSubject<ICurrentUser|undefined>	=
		new BehaviorSubject<ICurrentUser|undefined>(undefined)
	;

	/** @ignore */
	private async getItemInternal<T> (
		url: string,
		proto: IProto<T>,
		publicData: boolean,
		anonymous: boolean = false
	) : Promise<{
		progress: Observable<number>;
		result: ITimedValue<T>;
	}> {
		if (!anonymous && this.currentUser.value) {
			url	= await this.processURL(url);
			await this.waitForUnlock(url);
		}

		const downloadTask	= this.databaseService.downloadItem(url, BinaryProto);
		const result		= await downloadTask.result;

		return {
			progress: downloadTask.progress,
			result: {
				timestamp: result.timestamp,
				value: await this.open(url, proto, publicData, result.value, anonymous)
			}
		};
	}

	/** @ignore */
	private async open<T> (
		url: string,
		proto: IProto<T>,
		publicData: boolean,
		data: Uint8Array,
		anonymous: boolean = false
	) : Promise<T> {
		const currentUser	= anonymous ? undefined : await this.getCurrentUser();

		return util.deserialize(proto, await (async () => {
			if (publicData) {
				const username	= (url.match(/\/?users\/(.*?)\//) || [])[1] || '';

				return this.potassiumService.sign.open(
					data,
					currentUser && username === currentUser.user.username ?
						currentUser.keys.signingKeyPair.publicKey :
						(await this.getUserPublicKeys(username)).publicSigningKey
				);
			}
			else if (currentUser) {
				return this.potassiumService.secretBox.open(data, currentUser.keys.symmetricKey);
			}
			else {
				throw new Error('Cannot anonymously open private data.');
			}
		})());
	}

	/** @ignore */
	private async processLockURL (url: string) : Promise<string> {
		const currentUser	= await this.getCurrentUser();

		return (await this.processURL(url)).replace(
			`users/${currentUser.user.username}/`,
			`users/${currentUser.user.username}/locks/`
		);
	}

	/** @ignore */
	private async processURL (url: string) : Promise<string> {
		if (url.match(/^\/?users/)) {
			return url;
		}

		const currentUser	= await this.getCurrentUser();
		return `users/${currentUser.user.username}/${url}`;
	}

	/** @ignore */
	private async seal<T> (
		url: string,
		proto: IProto<T>,
		value: T,
		publicData: boolean
	) : Promise<Uint8Array> {
		const currentUser	= await this.getCurrentUser();
		url					= await this.processURL(url);
		const data			= await util.serialize(proto, value);

		return publicData ?
			await this.potassiumService.sign.sign(
				data,
				currentUser.keys.signingKeyPair.privateKey
			) :
			await this.potassiumService.secretBox.seal(
				data,
				currentUser.keys.symmetricKey
			)
		;
	}

	/** @see DatabaseService.downloadItem */
	public downloadItem<T> (url: string, proto: IProto<T>, publicData: boolean = false) : {
		progress: Observable<number>;
		result: Promise<ITimedValue<T>>;
	} {
		const progress	= new BehaviorSubject(0);

		const result	= (async () => {
			const downloadTask	= await this.getItemInternal(url, proto, publicData);

			downloadTask.progress.subscribe(
				n => { progress.next(n); },
				err => { progress.error(err); },
				() => { progress.complete(); }
			);

			return downloadTask.result;
		})();

		return {progress, result};
	}

	/** @see DatabaseService.getAsyncValue */
	public getAsyncValue<T> (
		url: string,
		proto: IProto<T>,
		publicData: boolean = false
	) : IAsyncValue<T> {
		const defaultValue	= proto.create();
		const localLock		= util.lockFunction();

		const asyncValue	= (async () => {
			url	= await this.processURL(url);

			return this.databaseService.getAsyncValue(
				url,
				BinaryProto,
				this.lockFunction(url)
			);
		})();

		return {
			getValue: async () => localLock(async () => {
				await this.waitForUnlock(url);
				return this.open(url, proto, publicData, await (await asyncValue).getValue());
			}).catch(
				() => defaultValue
			),
			lock: async (f, reason) =>
				(await asyncValue).lock(f, reason)
			,
			setValue: async value => localLock(async () => (await asyncValue).setValue(
				await this.seal(url, proto, value, publicData)
			)),
			updateValue: async f => (await asyncValue).updateValue(async value => this.seal(
				url,
				proto,
				await f(await this.open(url, proto, publicData, value)),
				publicData
			)),
			watch: memoize(() =>
				this.watch(url, proto, publicData).map<ITimedValue<T>, T>(o => o.value)
			)
		};
	}

	/** Keys and profile of currently logged in user. */
	public async getCurrentUser () : Promise<ICurrentUser> {
		const currentUser	=
			this.currentUser.value ||
			await this.currentUser.skipWhile(o => !o).take(1).toPromise()
		;

		if (!currentUser) {
			throw new Error('Cannot get current user.');
		}

		return currentUser;
	}

	/** @see DatabaseService.getItem */
	public async getItem<T> (
		url: string,
		proto: IProto<T>,
		publicData: boolean = false,
		anonymous: boolean = false
	) : Promise<T> {
		return (await (await this.getItemInternal(url, proto, publicData, anonymous)).result).value;
	}

	/** Gets public keys belonging to the specified user. */
	public async getUserPublicKeys (username: string) : Promise<IAGSEPKICert> {
		if (!username) {
			throw new Error('Invalid username.');
		}

		const certificate	= await this.databaseService.getItem(
			`users/${username}/certificate`,
			BinaryProto
		);

		const dataView			= this.potassiumService.toDataView(certificate);
		const rsaKeyIndex		= dataView.getUint32(0, true);
		const sphincsKeyIndex	= dataView.getUint32(4, true);
		const signed			= this.potassiumService.toBytes(certificate, 8);

		if (
			rsaKeyIndex >= this.agsePublicSigningKeys.rsa.length ||
			sphincsKeyIndex >= this.agsePublicSigningKeys.sphincs.length
		) {
			throw new Error('Invalid AGSE-PKI certificate: bad key index.');
		}

		const verified	= await util.deserialize<IAGSEPKICert>(
			AGSEPKICert,
			await this.potassiumService.sign.open(
				signed,
				await this.potassiumService.sign.importSuperSphincsPublicKeys(
					this.agsePublicSigningKeys.rsa[rsaKeyIndex],
					this.agsePublicSigningKeys.sphincs[sphincsKeyIndex]
				)
			)
		);

		if (verified.username !== username) {
			throw new Error('Invalid AGSE-PKI certificate: bad username.');
		}

		return verified;
	}

	/** @see DatabaseService.hasItem */
	public async hasItem (url: string) : Promise<boolean> {
		return this.databaseService.hasItem(url);
	}

	/** @see DatabaseService.lock */
	public async lock<T> (
		url: string,
		f: (reason?: string) => Promise<T>,
		reason?: string
	) : Promise<T> {
		const currentUser	= await this.getCurrentUser();

		return this.databaseService.lock(
			await this.processLockURL(url),
			async r => f(!r ?
				undefined :
				this.potassiumService.toString(
					await this.potassiumService.secretBox.open(
						this.potassiumService.fromBase64(r),
						currentUser.keys.symmetricKey
					)
				)
			),
			!reason ?
				undefined :
				this.potassiumService.toBase64(
					await this.potassiumService.secretBox.seal(
						this.potassiumService.fromString(reason),
						currentUser.keys.symmetricKey
					)
				)
		);
	}

	/** @see DatabaseService.lockFunction */
	public lockFunction (url: string) : LockFunction {
		return async <T> (f: (reason?: string) => Promise<T>, reason?: string) =>
			this.lock(url, f, reason)
		;
	}

	/** @see DatabaseService.lockStatus */
	public async lockStatus (url: string) : Promise<{locked: boolean; reason: string|undefined}> {
		const currentUser		= await this.getCurrentUser();
		const {locked, reason}	=
			await this.databaseService.lockStatus(await this.processLockURL(url))
		;

		return {
			locked,
			reason: !reason ?
				undefined :
				this.potassiumService.toString(
					await this.potassiumService.secretBox.open(
						this.potassiumService.fromBase64(reason),
						currentUser.keys.symmetricKey
					)
				)
		};
	}

	/** @see DatabaseService.pushItem */
	public async pushItem<T> (
		url: string,
		proto: IProto<T>,
		value: T,
		publicData: boolean = false
	) : Promise<{hash: string; url: string}> {
		return this.databaseService.pushItem(
			await this.processURL(url),
			BinaryProto,
			await this.seal(url, proto, value, publicData)
		);
	}

	/** @see DatabaseService.removeItem */
	public async removeItem (url: string) : Promise<void> {
		url	= await this.processURL(url);

		return this.databaseService.removeItem(url);
	}

	/** @see DatabaseService.setItem */
	public async setItem<T> (
		url: string,
		proto: IProto<T>,
		value: T,
		publicData: boolean = false
	) : Promise<{hash: string; url: string}> {
		return this.lock(url, async () => this.databaseService.setItem(
			await this.processURL(url),
			BinaryProto,
			await this.seal(url, proto, value, publicData)
		));
	}

	/** @see DatabaseService.uploadItem */
	public uploadItem<T> (
		url: string,
		proto: IProto<T>,
		value: T,
		publicData: boolean = false
	) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		let cancel	= () => {};
		const cancelPromise	= new Promise<void>(resolve => {
			cancel	= resolve;
		});

		const progress	= new BehaviorSubject(0);

		const result	= (async () => {
			const uploadTask	= this.databaseService.uploadItem(
				await this.processURL(url),
				BinaryProto,
				await this.seal(url, proto, value, publicData)
			);

			cancelPromise.then(() => { uploadTask.cancel(); });

			uploadTask.progress.subscribe(
				n => { progress.next(n); },
				err => { progress.error(err); },
				() => { progress.complete(); }
			);

			return uploadTask.result;
		})();

		return {cancel, progress, result};
	}

	/** @see DatabaseService.waitForUnlock */
	public async waitForUnlock (url: string) : Promise<{
		reason: string|undefined;
		wasLocked: boolean;
	}> {
		const currentUser			= await this.getCurrentUser();
		const {reason, wasLocked}	=
			await this.databaseService.waitForUnlock(await this.processLockURL(url))
		;

		return {
			reason: !reason ?
				undefined :
				this.potassiumService.toString(
					await this.potassiumService.secretBox.open(
						this.potassiumService.fromBase64(reason),
						currentUser.keys.symmetricKey
					)
				)
			,
			wasLocked
		};
	}

	/** @see DatabaseService.watch */
	public watch<T> (
		url: string,
		proto: IProto<T>,
		publicData: boolean = false
	) : Observable<ITimedValue<T>> {
		return util.flattenObservablePromise(
			async () => {
				url	= await this.processURL(url);

				return this.databaseService.watch(url, BinaryProto).flatMap(async data => ({
					timestamp: data.timestamp,
					value: await this.open(url, proto, publicData, data.value)
				}));
			},
			{timestamp: NaN, value: proto.create()}
		);
	}

	/** @see DatabaseService.watchList */
	public watchList<T> (
		url: string,
		proto: IProto<T>,
		publicData: boolean = false
	) : Observable<ITimedValue<T>[]> {
		return util.flattenObservablePromise(
			async () => {
				url	= await this.processURL(url);

				return this.databaseService.watchList(url, BinaryProto).flatMap(async list =>
					Promise.all(list.map(async data => ({
						timestamp: data.timestamp,
						value: await this.open(url, proto, publicData, data.value)
					})))
				);
			},
			[{timestamp: NaN, value: proto.create()}]
		);
	}

	/** @see DatabaseService.watchListPushes */
	public watchListPushes<T> (
		url: string,
		proto: IProto<T>,
		publicData: boolean = false
	) : Observable<ITimedValue<T>> {
		return util.flattenObservablePromise(
			async () => {
				url	= await this.processURL(url);

				return this.databaseService.watchListPushes(
					url,
					BinaryProto
				).flatMap(async data => ({
					timestamp: data.timestamp,
					value: await this.open(url, proto, publicData, data.value)
				}));
			},
			{timestamp: NaN, value: proto.create()}
		);
	}

	constructor (
		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {}
}
