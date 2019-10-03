import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {IProto} from '../cyph/iproto';
import {ITimedValue} from '../cyph/itimed-value';
import {LockFunction} from '../cyph/lock-function-type';
import {MaybePromise} from '../cyph/maybe-promise-type';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {DatabaseService} from '../cyph/services/database.service';
import {EnvService} from '../cyph/services/env.service';
import {LocalStorageService} from '../cyph/services/local-storage.service';
import {getOrSetDefault} from '../cyph/util/get-or-set-default';
import {lockFunction} from '../cyph/util/lock';
import {random} from '../cyph/util/random';
import {deserialize, serialize} from '../cyph/util/serialization';
import {getTimestamp} from '../cyph/util/time';
import {sleep} from '../cyph/util/wait';

/**
 * Mocks storage subset of database service.
 */
@Injectable()
export class MockDatabaseService extends DatabaseService {
	/** @ignore */
	private readonly locks: Map<string, LockFunction> = new Map();

	/** @ignore */
	private readonly uploadedItems: Map<string, Uint8Array> = new Map<
		string,
		Uint8Array
	>();

	/** @ignore */
	private async pretendToTransferData (
		mbps: number,
		size: number,
		progress: BehaviorSubject<number>
	) : Promise<void> {
		let bytesTransferred = 0;
		const increment = (mbps * 131072) / 4;

		while (bytesTransferred < size) {
			await sleep();
			bytesTransferred = Math.min(
				bytesTransferred + random() * increment * 2,
				size
			);
			progress.next((bytesTransferred / size) * 100);
		}

		progress.next(100);
		progress.complete();
	}

	/** @inheritDoc */
	public downloadItem<T> (
		url: string,
		proto: IProto<T>
	) : {
		alreadyCached: Promise<boolean>;
		progress: Observable<number>;
		result: Promise<ITimedValue<T>>;
	} {
		const progress = new BehaviorSubject(0);

		const result = (async () => {
			const value = this.uploadedItems.get(url);
			if (!value) {
				throw new Error('Item not found.');
			}
			await this.pretendToTransferData(50, value.length, progress);
			return {
				timestamp: await getTimestamp(),
				value: await deserialize(proto, value)
			};
		})();

		return {alreadyCached: Promise.resolve(false), progress, result};
	}

	/** @inheritDoc */
	public async lock<T> (
		url: MaybePromise<string>,
		f: (o: {
			reason?: string;
			stillOwner: BehaviorSubject<boolean>;
		}) => Promise<T>,
		reason?: string,
		_GLOBAL?: boolean
	) : Promise<T> {
		return getOrSetDefault(this.locks, await url, lockFunction)(f, reason);
	}

	/** @inheritDoc */
	public uploadItem<T> (
		url: string,
		proto: IProto<T>,
		value: T,
		_NO_BLOB_STORAGE?: boolean
	) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		const progress = new BehaviorSubject(0);

		const result = (async () => {
			const data = await serialize(proto, value);
			await this.pretendToTransferData(15, data.length, progress);
			this.uploadedItems.set(url, data);
			return {hash: '', url};
		})();

		return {cancel: () => {}, progress, result};
	}

	constructor (
		envService: EnvService,
		localStorageService: LocalStorageService,
		potassiumService: PotassiumService
	) {
		super(envService, localStorageService, potassiumService);
	}
}
