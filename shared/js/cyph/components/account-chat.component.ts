import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {UserPresence} from '../account/enums';
import {accountChatProviders} from '../providers';
import {AccountChatService} from '../services/account-chat.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {EnvService} from '../services/env.service';
import {SessionService} from '../services/session.service';
import {StringsService} from '../services/strings.service';
import {sleep} from '../util/wait';


/**
 * Angular component for account chat UI.
 */
@Component({
	providers: accountChatProviders,
	selector: 'cyph-account-chat',
	styleUrls: ['../../../css/components/account-chat.scss'],
	templateUrl: '../../../templates/account-chat.html'
})
export class AccountChatComponent implements OnDestroy, OnInit {
	/** @ignore */
	private initiated: boolean	= false;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.sessionService.state.isAlive	= false;
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.activatedRoute.params.subscribe(async o => {
			const username: string|undefined	= o.username;

			if (!username) {
				return;
			}

			if (this.initiated) {
				this.router.navigate(['account']);
				await sleep(0);
				this.router.navigate(['account', 'messages', username]);
				return;
			}

			this.initiated	= true;
			this.accountChatService.setUser(username);
		});
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountChatService: AccountChatService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
