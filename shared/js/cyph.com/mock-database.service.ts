import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {IProto} from '../cyph/iproto';
import {ITimedValue} from '../cyph/itimed-value';
import {DatabaseService} from '../cyph/services/database.service';
import * as util from '../cyph/util';


/**
 * Mocks storage subset of database service.
 */
@Injectable()
export class MockDatabaseService extends DatabaseService {
	/** @ignore */
	private uploadedItems: Map<string, Uint8Array>	= new Map<string, Uint8Array>();

	/** @ignore */
	private async pretendToTransferData (
		mbps: number,
		size: number,
		progress: BehaviorSubject<number>
	) : Promise<void> {
		let bytesTransferred	= 0;
		const increment			= (mbps * 131072) / 4;

		while (bytesTransferred < size) {
			await util.sleep();
			bytesTransferred	= Math.min(
				bytesTransferred + (util.random() * increment * 2),
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
				timestamp: await util.timestamp(),
				value: await util.deserialize(proto, value)
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
			const data	= await util.serialize(proto, value);
			await this.pretendToTransferData(15, data.length, progress);
			this.uploadedItems.set(url, data);
			return {hash: '', url};
		})();

		return {cancel: () => {}, progress, result};
	}

	constructor () {
		super();
	}
}
