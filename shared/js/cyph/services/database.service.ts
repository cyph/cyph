import {Injectable} from '@angular/core';
import * as firebase from 'firebase';


/**
 * Provides online database and storage functionality.
 */
@Injectable()
export class DatabaseService {
	/** Returns a reference to a database object. */
	public async getDatabaseRef (_URL: string) : Promise<firebase.database.Reference> {
		throw new Error('Must provide an implementation of DatabaseService.getDatabaseRef.');
	}

	/** Returns a reference to a storage object. */
	public async getStorageRef (_URL: string) : Promise<firebase.storage.Reference> {
		throw new Error('Must provide an implementation of DatabaseService.getStorageRef.');
	}

	/** @see Util.retryUntilSuccessful */
	public async retryUntilSuccessful<T> (_F: () => (T|Promise<T>)) : Promise<T> {
		throw new Error('Must provide an implementation of DatabaseService.retryUntilSuccessful.');
	}

	constructor () {}
}
