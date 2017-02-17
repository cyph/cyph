import {Injectable} from '@angular/core';
import {AccountAuthService} from '../services/account-auth.service';


/**
 * @see Account home service.
 */
@Injectable()
export class AccountHomeService {
	constructor (
		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService
	) {}
}
