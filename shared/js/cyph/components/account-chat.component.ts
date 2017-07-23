import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {UserPresence} from '../account/enums';
import {AccountChannelService} from '../services/account-channel.service';
import {AccountChatService} from '../services/account-chat.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountSessionService} from '../services/account-session.service';
import {ChannelService} from '../services/channel.service';
import {ChatService} from '../services/chat.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {AccountCastleService} from '../services/crypto/account-castle.service';
import {CastleService} from '../services/crypto/castle.service';
import {CyphertextService} from '../services/cyphertext.service';
import {EnvService} from '../services/env.service';
import {FileTransferService} from '../services/file-transfer.service';
import {P2PWebRTCService} from '../services/p2p-webrtc.service';
import {P2PService} from '../services/p2p.service';
import {ScrollService} from '../services/scroll.service';
import {SessionCapabilitiesService} from '../services/session-capabilities.service';
import {SessionInitService} from '../services/session-init.service';
import {SessionService} from '../services/session.service';


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
		P2PWebRTCService,
		ScrollService,
		SessionCapabilitiesService,
		SessionInitService,
		{
			provide: CastleService,
			useClass: AccountCastleService
		},
		{
			provide: ChannelService,
			useClass: AccountChannelService
		},
		{
			provide: ChatService,
			useExisting: AccountChatService
		},
		{
			provide: SessionService,
			useExisting: AccountSessionService
		}
	],
	selector: 'cyph-account-chat',
	styleUrls: ['../../../css/components/account-chat.scss'],
	templateUrl: '../../../templates/account-chat.html'
})
export class AccountChatComponent implements OnInit {
	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** @inheritDoc */
	public ngOnInit () : void {
		this.activatedRouteService.params.subscribe(o => {
			const username: string|undefined	= o.username;

			if (!username) {
				return;
			}

			this.accountChatService.setUser(username);
		});
	}

	constructor (
		/** @ignore */
		private readonly accountChatService: AccountChatService,

		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
