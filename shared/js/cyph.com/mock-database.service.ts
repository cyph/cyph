import {Injectable} from '@angular/core';
import * as firebase from 'firebase';
import {DatabaseService} from '../cyph/services/database.service';
import {util} from '../cyph/util';


/**
 * Mocks storage subset of database service.
 */
@Injectable()
export class MockDatabaseService extends DatabaseService {
	/** @inheritDoc */
	public async getStorageRef (_URL: string) : Promise<firebase.storage.Reference> {
		return {
			bucket: '',
			child: (_PATH: string) => { throw new Error('Not implemented.'); },
			delete: async () => {},
			fullPath: '',
			getDownloadURL: () => { throw new Error('Not implemented.'); },
			getMetadata: () => { throw new Error('Not implemented.'); },
			name: '',
			/* tslint:disable-next-line:no-null-keyword */
			parent: null,
			put: (blob: Blob, _METADATA?: firebase.storage.UploadMetadata) => {
				const snapshot: firebase.storage.UploadTaskSnapshot	= {
					bytesTransferred: 0,
					downloadURL: URL.createObjectURL(blob),
					metadata: <firebase.storage.FullMetadata> {},
					ref: <firebase.storage.Reference> {},
					state: <firebase.storage.TaskState> {},
					task: <firebase.storage.UploadTask> {},
					totalBytes: blob.size
				};

				return {
					cancel: () => true,
					catch: async (_ON_REJECTED: (a: Error) => any) => {},
					on: (
						_EVENT_TYPE: string,
						onStateChanged:
							(snapshot: firebase.storage.UploadTaskSnapshot) => void
						,
						_ON_ERROR: (err: any) => void,
						onComplete: () => void
					) => {
						(async () => {
							/* Fake out 50 Mb/s connection */
							while (snapshot.bytesTransferred < snapshot.totalBytes) {
								await util.sleep();

								snapshot.bytesTransferred	= Math.min(
									snapshot.bytesTransferred + 1638400,
									snapshot.totalBytes
								);

								onStateChanged(snapshot);
							}

							onComplete();
						})();

						return () => {};
					},
					pause: () => true,
					resume: () => true,
					snapshot,
					then: async (
						_ON_FULFILLED?: (a: firebase.storage.UploadTaskSnapshot) => any,
						_ON_REJECTED?: (a: Error) => any
					) => {}
				};
			},
			putString: (
				_DATA: string,
				_FORMAT?: firebase.storage.StringFormat,
				_METADATA?: firebase.storage.UploadMetadata
			) => {
				throw new Error('Not implemented.');
			},
			root: <any> undefined,
			storage: <any> undefined,
			toString: () => { throw new Error('Not implemented.'); },
			updateMetadata: (_METADATA: firebase.storage.SettableMetadata) => {
				throw new Error('Not implemented.');
			}
		};
	}

	constructor () {
		super();
	}
}
