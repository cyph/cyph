import {Injectable} from '@angular/core';
import {DataManagerService} from '../service-interfaces/data-manager.service';


/**
 * Provides local storage functionality.
 */
@Injectable()
export class LocalStorageService extends DataManagerService {
	constructor () {
		super();
	}
}
