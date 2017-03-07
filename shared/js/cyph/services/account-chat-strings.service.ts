import {Injectable} from '@angular/core';
import {AccountSessionService} from './account-session.service';
import {ChatStringsService} from './chat-strings.service';
import {SessionService} from './session.service';


/**
 * Account chat strings service.
 */
@Injectable()
export class AccountChatStringsService extends ChatStringsService {
	/** @inheritDoc */
	public get friend () : string {
		if (!this.accountSessionService || !this.accountSessionService.user) {
			return '';
		}

		return this.accountSessionService.user.realUsername;
	}

	/** @ignore */
	public set friend (_: string) {}

	constructor (
		sessionService: SessionService,

		/** @ignore */
		private readonly accountSessionService: AccountSessionService
	) {
		super(sessionService);

		sessionService.setRemoteUsername(this.friend);
	}
}
