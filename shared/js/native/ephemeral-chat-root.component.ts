import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {AppService} from './app.service';
import {ChatRootStates} from './js/cyph.im/enums';
import {fadeIn} from './js/cyph/animations';
import {ChatEnvService} from './js/cyph/services/chat-env.service';
import {ChatStringsService} from './js/cyph/services/chat-strings.service';
import {ChatService} from './js/cyph/services/chat.service';
import {CyphertextService} from './js/cyph/services/cyphertext.service';
import {DialogService} from './js/cyph/services/dialog.service';
import {EnvService} from './js/cyph/services/env.service';
import {EphemeralSessionService} from './js/cyph/services/ephemeral-session.service';
import {FileTransferService} from './js/cyph/services/file-transfer.service';
import {P2PWebRTCService} from './js/cyph/services/p2p-webrtc.service';
import {P2PService} from './js/cyph/services/p2p.service';
import {ScrollService} from './js/cyph/services/scroll.service';
import {SessionCapabilitiesService} from './js/cyph/services/session-capabilities.service';
import {SessionInitService} from './js/cyph/services/session-init.service';
import {SessionService} from './js/cyph/services/session.service';
import {StringsService} from './js/cyph/services/strings.service';
import {UrlSessionInitService} from './js/cyph/services/url-session-init.service';
import {events} from './js/cyph/session/enums';


/**
 * Angular component for chat UI root to share services.
 */
@Component({
	animations: [fadeIn],
	providers: [
		ChatService,
		CyphertextService,
		FileTransferService,
		P2PService,
		P2PWebRTCService,
		ScrollService,
		SessionCapabilitiesService,
		{
			provide: EnvService,
			useClass: ChatEnvService
		},
		{
			provide: SessionInitService,
			useClass: UrlSessionInitService
		},
		{
			provide: SessionService,
			useClass: EphemeralSessionService
		},
		{
			provide: StringsService,
			useClass: ChatStringsService
		}
	],
	selector: 'cyph-chat-root',
	templateUrl: './templates/chat-root.html'
})
export class EphemeralChatRootComponent implements OnDestroy, OnInit {
	/** @ignore */
	private destroyed: boolean	= false;

	/** @see ChatRootStates */
	public readonly chatRootStates: typeof ChatRootStates	= ChatRootStates;

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.destroyed	= true;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.appService.chatRootState	= ChatRootStates.blank;

		if (
			this.sessionInitService.callType &&
			!(await this.sessionCapabilitiesService.localCapabilities).p2p
		) {
			await this.dialogService.alert({
				content: this.stringsService.p2pDisabledLocal,
				ok: this.stringsService.ok,
				title: this.stringsService.p2pTitle
			});

			self.close();

			return;
		}


		this.sessionService.one(events.abort).then(() => {
			if (this.destroyed) {
				return;
			}

			beforeUnloadMessage				= undefined;
			this.appService.chatRootState	= ChatRootStates.chat;
		});

		this.sessionService.one(events.beginChatComplete).then(() => {
			if (this.destroyed) {
				return;
			}

			beforeUnloadMessage	= this.stringsService.disconnectWarning;

			if (this.sessionInitService.callType && this.sessionService.state.isAlice) {
				this.p2pWebRTCService.request(this.sessionInitService.callType);
			}
		});

		this.sessionService.one(events.beginWaiting).then(() => {
			if (this.destroyed) {
				return;
			}

			this.appService.chatRootState	= ChatRootStates.waitingForFriend;
		});

		this.sessionService.connected.then(() => {
			if (this.destroyed) {
				return;
			}

			this.appService.chatRootState	= ChatRootStates.chat;

			if (this.sessionInitService.callType) {
				this.dialogService.toast(
					this.sessionInitService.callType === 'video' ?
						this.stringsService.p2pWarningVideoPassive :
						this.stringsService.p2pWarningAudioPassive
					,
					5000
				);
			}
		});

		this.sessionService.one(events.cyphNotFound).then(() => {
			if (this.destroyed) {
				return;
			}

			this.appService.chatRootState	= ChatRootStates.error;
			this.routerService.navigate(['404']);
		});
	}

	constructor (
		/** @ignore */
		private readonly appService: AppService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly p2pWebRTCService: P2PWebRTCService,

		/** @ignore */
		private readonly routerService: Router,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		private readonly sessionCapabilitiesService: SessionCapabilitiesService,

		/** @ignore */
		private readonly sessionInitService: SessionInitService,

		/** @ignore */
		private readonly stringsService: StringsService,

		/** @see CyphertextService */
		public readonly cyphertextService: CyphertextService
	) {}
}
