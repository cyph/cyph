import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {UserPresence} from '../account/enums';
import {AccountAuthService} from '../services/account-auth.service';
import {AccountChatStringsService} from '../services/account-chat-strings.service';
import {AccountChatService} from '../services/account-chat.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountSessionService} from '../services/account-session.service';
import {ChannelService} from '../services/channel.service';
import {ChatPotassiumService} from '../services/chat-potassium.service';
import {ChatService} from '../services/chat.service';
import {AnonymousCastleService} from '../services/crypto/anonymous-castle.service';
import {PotassiumService} from '../services/crypto/potassium.service';
import {CyphertextService} from '../services/cyphertext.service';
import {EnvService} from '../services/env.service';
import {FileTransferService} from '../services/file-transfer.service';
import {P2PWebRTCService} from '../services/p2p-webrtc.service';
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
		AnonymousCastleService,
		ChannelService,
		CyphertextService,
		FileTransferService,
		P2PService,
		P2PWebRTCService,
		ScrollService,
		{
			provide: ChatService,
			useExisting: AccountChatService
		},
		{
			provide: PotassiumService,
			useClass: ChatPotassiumService
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
