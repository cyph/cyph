import {Injectable} from '@angular/core';
import {AccountAuthService} from './account-auth.service';


/**
 * @see Account contacts service.
 */
@Injectable()
export class AccountFilesService {
	constructor (
		/** @ignore */
		private accountAuthService: AccountAuthService
	) {}
}
