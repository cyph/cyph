import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {UserPresence} from '../account/enums';
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
import {util} from '../util';


/**
 * Angular component for account chat UI.
 */
@Component({
	providers: [
		AccountChatService,
		AccountSessionService,
		ChannelService,
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
		this.activatedRouteService.params.subscribe(async o => {
			const username: string|undefined	= o.username;

			if (!username) {
				return;
			}

			if (this.initiated) {
				this.routerService.navigate(['account']);
				await util.sleep(0);
				this.routerService.navigate(['account', 'chat', username]);
				return;
			}

			this.initiated	= true;
			this.accountChatService.setUser(username);
		});
	}

	constructor (
		/** @ignore */
		private readonly activatedRouteService: ActivatedRoute,

		/** @ignore */
		private readonly routerService: Router,

		/** @ignore */
		private readonly accountChatService: AccountChatService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SessionService */
		public readonly sessionService: SessionService
	) {}
}
