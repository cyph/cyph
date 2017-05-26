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

	/** Gets a value from the database. */
	public async getDatabaseValue<T> (_URL: string) : Promise<T|undefined> {
		throw new Error('Must provide an implementation of DatabaseService.getDatabaseValue.');
	}

	/** Returns a reference to a storage object. */
	public async getStorageRef (_URL: string) : Promise<firebase.storage.Reference> {
		throw new Error('Must provide an implementation of DatabaseService.getStorageRef.');
	}

	/** Logs in. */
	public async login (_USERNAME: string, _PASSWORD: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.login.');
	}

	/** Logs out. */
	public async logout () : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.logout.');
	}

	/** Registers. */
	public async register (_USERNAME: string, _PASSWORD: string) : Promise<void> {
		throw new Error('Must provide an implementation of DatabaseService.register.');
	}

	constructor () {}
}
