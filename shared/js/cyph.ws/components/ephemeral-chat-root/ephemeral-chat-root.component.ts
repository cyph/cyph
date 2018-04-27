import {AfterViewInit, Component, OnDestroy} from '@angular/core';
import {Router} from '@angular/router';
import * as Granim from 'granim';
import * as $ from 'jquery';
import * as Konami from 'konami-code.js';
import {fadeIn} from '../../../cyph/animations';
import {States as ChatStates} from '../../../cyph/chat/enums';
import {ChannelService} from '../../../cyph/services/channel.service';
import {ChatEnvService} from '../../../cyph/services/chat-env.service';
import {ChatMessageGeometryService} from '../../../cyph/services/chat-message-geometry.service';
import {ChatService} from '../../../cyph/services/chat.service';
import {AnonymousCastleService} from '../../../cyph/services/crypto/anonymous-castle.service';
import {CastleService} from '../../../cyph/services/crypto/castle.service';
import {CyphertextService} from '../../../cyph/services/cyphertext.service';
import {DialogService} from '../../../cyph/services/dialog.service';
import {EnvService} from '../../../cyph/services/env.service';
import {EphemeralSessionService} from '../../../cyph/services/ephemeral-session.service';
import {FileTransferService} from '../../../cyph/services/file-transfer.service';
import {P2PWebRTCService} from '../../../cyph/services/p2p-webrtc.service';
import {P2PService} from '../../../cyph/services/p2p.service';
import {ScrollService} from '../../../cyph/services/scroll.service';
import {SessionCapabilitiesService} from '../../../cyph/services/session-capabilities.service';
import {SessionInitService} from '../../../cyph/services/session-init.service';
import {SessionService} from '../../../cyph/services/session.service';
import {SplitTestingService} from '../../../cyph/services/split-testing.service';
import {StringsService} from '../../../cyph/services/strings.service';
import {UrlSessionInitService} from '../../../cyph/services/url-session-init.service';
import {events} from '../../../cyph/session/enums';
import {random} from '../../../cyph/util/random';
import {sleep} from '../../../cyph/util/wait';
import {AppService} from '../../app.service';
import {ChatRootStates} from '../../enums';


/**
 * Angular component for chat UI root to share services.
 */
@Component({
	animations: [fadeIn],
	providers: [
		ChannelService,
		ChatMessageGeometryService,
		ChatService,
		CyphertextService,
		FileTransferService,
		P2PService,
		P2PWebRTCService,
		ScrollService,
		SessionCapabilitiesService,
		{
			provide: CastleService,
			useClass: AnonymousCastleService
		},
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
		}
	],
	selector: 'cyph-ephemeral-chat-root',
	styleUrls: ['./ephemeral-chat-root.component.scss'],
	templateUrl: './ephemeral-chat-root.component.html'
})
export class EphemeralChatRootComponent implements AfterViewInit, OnDestroy {
	/** @ignore */
	private destroyed: boolean	= false;

	/** @see ChatRootStates */
	public readonly chatRootStates: typeof ChatRootStates	= ChatRootStates;

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		await sleep(0);

		this.appService.chatRootState	= ChatRootStates.blank;

		const granimStates	= {
			'default-state': !this.envService.isTelehealth ?
				{
					gradients: [
						['#392859', '#624599'],
						['#9368e6', '#624599']
					],
					loop: true,
					transitionSpeed: 5000
				} :
				{
					direction: 'diagonal',
					gradients: [
						['#eeecf1', '#fbf8fe'],
						['#fbf8fe', '#eeecf1']
					],
					loop: true,
					opacity: [0.75, 0.5],
					transitionSpeed: 2500
				}
			,
			'paused': !this.envService.isTelehealth ?
				{
					gradients: [
						['#624599', '#8b62d9'],
						['#9368e6', '#624599']
					],
					transitionSpeed: 5000
				} :
				undefined
		};

		const granim	= !this.envService.isWeb ?
			undefined :
			<{
				changeState: (state: string) => void;
				clear: () => void;
				pause: () => void;
				play: () => void;
			}> new Granim({
				direction: 'radial',
				element: '#main-chat-gradient',
				isPausedWhenNotInView: true,
				name: 'basic-gradient',
				opacity: [1, 1],
				states: granimStates
			})
		;

		if (granim) {
			(async () => {
				await sleep(random(5000));

				if (granimStates.paused) {
					granim.changeState('paused');
				}

				await sleep(3000);
				granim.pause();
			})();
		}

		if (this.sessionService.apiFlags.modestBranding) {
			if (this.envService.isWeb) {
				$(document.body).addClass('modest');
			}
			else {
				/* TODO: HANDLE NATIVE */
			}
		}

		if (this.sessionService.state.startingNewCyph !== true) {
			this.appService.isLockedDown	= false;

			this.router.navigate(
				(
					this.router.routerState.snapshot.root.firstChild &&
					this.router.routerState.snapshot.root.firstChild.url.length > 1
				) ?
					this.router.routerState.snapshot.root.firstChild.url.
						slice(0, -1).
						map(o => o.path)
					:
					['']
			);
		}

		/* If unsupported, warn and then close window */
		if (this.sessionInitService.callType && !P2PWebRTCService.isSupported) {
			await this.dialogService.alert({
				content: this.envService.isIOS ?
					this.stringsService.p2pDisabledLocalIOS :
					this.stringsService.p2pDisabledLocal
				,
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
		});

		this.sessionService.one(events.cyphNotFound).then(() => {
			if (this.destroyed) {
				return;
			}

			this.appService.chatRootState	= ChatRootStates.error;
			this.router.navigate(['404']);
		});

		/* Cyphertext easter egg */
		if (this.cyphertextService.isEnabled) {
			/* tslint:disable-next-line:no-unused-expression */
			new Konami(async () => {
				if (this.destroyed) {
					return;
				}

				while (this.chatService.chat.state !== ChatStates.chat) {
					await sleep();
				}

				this.cyphertextService.show();
			});
		}

		/* For automated tests */
		if (this.envService.isWeb) {
			(<any> self).sendMessage	=
				(message?: string, selfDestructTimeout?: number) => {
					this.chatService.send(undefined, {text: message}, selfDestructTimeout);
				}
			;
		}
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.destroyed	= true;
	}

	constructor (
		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly sessionInitService: SessionInitService,

		/** @see AppService */
		public readonly appService: AppService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see CyphertextService */
		public readonly cyphertextService: CyphertextService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see P2PService */
		public readonly p2pService: P2PService,

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see SplitTestingService */
		public readonly splitTestingService: SplitTestingService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
