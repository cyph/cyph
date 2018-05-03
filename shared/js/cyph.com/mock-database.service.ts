import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {IProto} from '../cyph/iproto';
import {ITimedValue} from '../cyph/itimed-value';
import {DatabaseService} from '../cyph/services/database.service';
import {EnvService} from '../cyph/services/env.service';
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
	private readonly uploadedItems: Map<string, Uint8Array>	= new Map<string, Uint8Array>();

	/** @ignore */
	private async pretendToTransferData (
		mbps: number,
		size: number,
		progress: BehaviorSubject<number>
	) : Promise<void> {
		let bytesTransferred	= 0;
		const increment			= (mbps * 131072) / 4;

		while (bytesTransferred < size) {
			await sleep();
			bytesTransferred	= Math.min(
				bytesTransferred + (random() * increment * 2),
				size
			);
			progress.next(bytesTransferred / size * 100);
		}

		progress.next(100);
		progress.complete();
	}

	/** @inheritDoc */
	public downloadItem<T> (url: string, proto: IProto<T>) : {
		progress: Observable<number>;
		result: Promise<ITimedValue<T>>;
	} {
		const progress	= new BehaviorSubject(0);

		const result	= (async () => {
			const value	= this.uploadedItems.get(url);
			if (!value) {
				throw new Error('Item not found.');
			}
			await this.pretendToTransferData(50, value.length, progress);
			return {
				timestamp: await getTimestamp(),
				value: await deserialize(proto, value)
			};
		})();

		return {progress, result};
	}

	/** @inheritDoc */
	public uploadItem<T> (url: string, proto: IProto<T>, value: T) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		const progress	= new BehaviorSubject(0);

		const result	= (async () => {
			const data	= await serialize(proto, value);
			await this.pretendToTransferData(15, data.length, progress);
			this.uploadedItems.set(url, data);
			return {hash: '', url};
		})();

		return {cancel: () => {}, progress, result};
	}

	constructor (envService: EnvService) {
		super(envService);
	}
}
