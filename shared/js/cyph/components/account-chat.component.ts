import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {UserPresence} from '../account/enums';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountChatStringsService} from '../services/account-chat-strings.service';
import {AccountChatService} from '../services/account-chat.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountSessionService} from '../services/account-session.service';
import {ChatService} from '../services/chat.service';
import {CyphertextService} from '../services/cyphertext.service';
import {EnvService} from '../services/env.service';
import {FileTransferService} from '../services/file-transfer.service';
import {P2PService} from '../services/p2p.service';
import {ScrollService} from '../services/scroll.service';
import {SessionService} from '../services/session.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account chat UI.
 */
@Component({
	providers: [
		AccountChatService,
		AccountSessionService,
		CyphertextService,
		FileTransferService,
		P2PService,
		ScrollService,
		{
			provide: ChatService,
			useExisting: AccountChatService
		},
		{
			provide: SessionService,
			useExisting: AccountSessionService
		},
		{
			provide: StringsService,
			useClass: AccountChatStringsService
		}
	],
	selector: 'cyph-account-chat',
	styleUrls: ['../../css/components/account-chat.css'],
	templateUrl: '../../../templates/account-chat.html'
})
export class AccountChatComponent implements OnChanges {
	/** Username of profile owner. */
	@Input() public username: string|undefined;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** @inheritDoc */
	public async ngOnChanges (_CHANGES: SimpleChanges) : Promise<void> {
		if (!this.username) {
			return;
		}

		this.accountChatService.setUser(this.username);
	}

	constructor (
		/** @ignore */
		private readonly accountChatService: AccountChatService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
