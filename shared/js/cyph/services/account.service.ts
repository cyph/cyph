import {Injectable} from '@angular/core';
import {AppService} from '../../cyph.im/app.service';
import {AccountStates} from '../../cyph.im/enums';


/**
 * @see Account service.
 */
@Injectable()
export class AccountService {
	
	/** @see AccountStates */
	public accountStates: typeof AccountStates	= AccountStates;
	
	public changeState (state : AccountStates) : void {
            this.appService.accountState = state;
    }

	constructor (
		/** @ignore */
		private appService: AppService

	) {}
}
