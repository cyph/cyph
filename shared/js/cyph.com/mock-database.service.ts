import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {DataType} from '../cyph/data-type';
import {DatabaseService} from '../cyph/services/database.service';
import {util} from '../cyph/util';


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
	public downloadItem (url: string) : {
		progress: Observable<number>;
		result: Promise<Uint8Array>;
	} {
		const progress	= new BehaviorSubject(0);

		const result	= (async () => {
			const data	= this.uploadedItems.get(url);
			if (!data) {
				throw new Error('Item not found.');
			}
			await this.pretendToTransferData(50, data.length, progress);
			return data;
		})();

		/* <any> is temporary workaround for https://github.com/ReactiveX/rxjs/issues/2539 */
		return {progress: <any> progress, result};
	}

	/** @inheritDoc */
	public uploadItem (url: string, value: DataType) : {
		cancel: () => void;
		progress: Observable<number>;
		result: Promise<{hash: string; url: string}>;
	} {
		const progress	= new BehaviorSubject(0);

		const result	= (async () => {
			const data	= await util.toBytes(value);
			await this.pretendToTransferData(15, data.length, progress);
			this.uploadedItems.set(url, data);
			return {hash: '', url};
		})();

		/* <any> is temporary workaround for https://github.com/ReactiveX/rxjs/issues/2539 */
		return {cancel: () => {}, progress: <any> progress, result};
	}

	constructor () {
		super();
	}
}
