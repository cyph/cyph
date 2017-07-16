import {Injectable} from '@angular/core';
import {DataManagerService} from '../service-interfaces/data-manager.service';


/**
 * Provides local storage functionality.
 */
@Injectable()
export class LocalStorageService extends DataManagerService {
	/** Used to prevent race condition getItem failures. */
	protected pendingSets: Map<string, Promise<void>>	= new Map<string, Promise<void>>();

	/** Wipes all local data. */
	public clear () : Promise<void> {
		throw new Error('Must provide an implementation of LocalStorageService.clear.');
	}

	constructor () {
		super();
	}
}
