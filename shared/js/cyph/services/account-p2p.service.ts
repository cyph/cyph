import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {sleep} from '../util/wait';
import {AccountSessionService} from './account-session.service';
import {ChatService} from './chat.service';
import {DialogService} from './dialog.service';
import {P2PWebRTCService} from './p2p-webrtc.service';
import {P2PService} from './p2p.service';
import {SessionCapabilitiesService} from './session-capabilities.service';
import {SessionInitService} from './session-init.service';
import {StringsService} from './strings.service';


/**
 * Angular service for account P2P.
 */
@Injectable()
export class AccountP2PService extends P2PService {
	/** @ignore */
	private readonly requestRedirect: boolean	= false;

	/** @ignore */
	protected async request (callType: 'audio'|'video') : Promise<void> {
		if (!this.requestRedirect) {
			return super.request(callType);
		}

		if (!this.accountSessionService.remoteUser.value) {
			return;
		}

		/* Workaround for "Form submission canceled because the form is not connected" warning */
		await sleep(0);

		await this.router.navigate([
			accountRoot,
			callType,
			this.accountSessionService.remoteUser.value.username
		]);
	}

	constructor (
		chatService: ChatService,
		dialogService: DialogService,
		p2pWebRTCService: P2PWebRTCService,
		sessionCapabilitiesService: SessionCapabilitiesService,
		sessionInitService: SessionInitService,
		stringsService: StringsService,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountSessionService: AccountSessionService
	) {
		super(
			chatService,
			dialogService,
			p2pWebRTCService,
			sessionCapabilitiesService,
			sessionInitService,
			stringsService
		);
	}
}
