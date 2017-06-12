import {AfterViewInit, Component, OnDestroy} from '@angular/core';
import {Router} from '@angular/router';
import * as Granim from 'granim';
import * as $ from 'jquery';
import * as Konami from 'konami-code.js';
import {fadeIn} from '../cyph/animations';
import {States as ChatStates} from '../cyph/chat/enums';
import {ChannelService} from '../cyph/services/channel.service';
import {ChatEnvService} from '../cyph/services/chat-env.service';
import {ChatPotassiumService} from '../cyph/services/chat-potassium.service';
import {ChatStringsService} from '../cyph/services/chat-strings.service';
import {ChatService} from '../cyph/services/chat.service';
import {AnonymousCastleService} from '../cyph/services/crypto/anonymous-castle.service';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {CyphertextService} from '../cyph/services/cyphertext.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {EphemeralSessionService} from '../cyph/services/ephemeral-session.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {FileTransferService} from '../cyph/services/file-transfer.service';
import {P2PWebRTCService} from '../cyph/services/p2p-webrtc.service';
import {P2PService} from '../cyph/services/p2p.service';
import {ScrollService} from '../cyph/services/scroll.service';
import {SessionCapabilitiesService} from '../cyph/services/session-capabilities.service';
import {SessionInitService} from '../cyph/services/session-init.service';
import {SessionService} from '../cyph/services/session.service';
import {StringsService} from '../cyph/services/strings.service';
import {UrlSessionInitService} from '../cyph/services/url-session-init.service';
import {VisibilityWatcherService} from '../cyph/services/visibility-watcher.service';
import {events} from '../cyph/session/enums';
import {util} from '../cyph/util';
import {AppService} from './app.service';
import {ChatRootStates} from './enums';


/**
 * Angular component for chat UI root to share services.
 */
@Component({
	animations: [fadeIn],
	providers: [
		AnonymousCastleService,
		ChannelService,
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
			provide: PotassiumService,
			useClass: ChatPotassiumService
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
	selector: 'cyph-ephemeral-chat-root',
	styleUrls: ['../../css/components/cyph.ws/ephemeral-chat-root.scss'],
	templateUrl: '../../templates/cyph.ws/ephemeral-chat-root.html'
})
export class EphemeralChatRootComponent implements AfterViewInit, OnDestroy {
	/** @ignore */
	private destroyed: boolean	= false;

	/** @see ChatRootStates */
	public readonly chatRootStates: typeof ChatRootStates	= ChatRootStates;

	public rand: boolean	= (util.random(2) === 1);

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		this.appService.chatRootState	= ChatRootStates.blank;

		const granimStates	= {
			'default-state': !this.sessionService.apiFlags.telehealth ?
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
			'paused': !this.sessionService.apiFlags.telehealth ?
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

		if (this.sessionService.apiFlags.modestBranding) {
			if (this.envService.isWeb) {
				$(document.body).addClass('modest');
			}
			else {
				/* TODO: HANDLE NATIVE */
			}
		}
		if (this.sessionService.apiFlags.telehealth) {
			if (this.envService.isWeb) {
				$(document.body).addClass('telehealth');
				this.faviconService.setFavicon('telehealth');
			}
			else {
				/* TODO: HANDLE NATIVE */
			}
		}

		if (this.sessionService.state.startingNewCyph !== true) {
			this.appService.isLockedDown	= false;

			this.routerService.navigate(
				(
					this.routerService.routerState.snapshot.root.firstChild &&
					this.routerService.routerState.snapshot.root.firstChild.url.length > 1
				) ?
					this.routerService.routerState.snapshot.root.firstChild.url.
						slice(0, -1).
						map(o => o.path)
					:
					['']
			);
		}

		/* If unsupported, warn and then close window */
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

		this.sessionService.one(events.beginChatComplete).then(async () => {
			if (this.destroyed) {
				return;
			}

			beforeUnloadMessage	= this.stringsService.disconnectWarning;

			if (this.sessionInitService.callType && this.sessionService.state.isAlice) {
				this.p2pWebRTCService.request(this.sessionInitService.callType);
			}

			if (granim) {
				await this.visibilityWatcherService.waitUntilVisible();

				if (granimStates.paused) {
					granim.changeState('paused');
				}

				await util.sleep(3000);
				granim.pause();
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

		/* Cyphertext easter egg */
		if (this.cyphertextService.isEnabled) {
			/* tslint:disable-next-line:no-unused-expression */
			new Konami(async () => {
				if (this.destroyed) {
					return;
				}

				while (this.chatService.chat.state !== ChatStates.chat) {
					await util.sleep();
				}

				this.cyphertextService.show();
			});
		}

		/* For automated tests */
		if (this.envService.isWeb) {
			(<any> self).sendMessage	=
				(message?: string, selfDestructTimeout?: number) => {
					this.chatService.send(message, selfDestructTimeout);
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
		private readonly chatService: ChatService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly faviconService: FaviconService,

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
		private readonly visibilityWatcherService: VisibilityWatcherService,

		/** @see AppService */
		public readonly appService: AppService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see P2PService */
		public readonly p2pService: P2PService,

		/** @see StringsService */
		public readonly stringsService: StringsService,

		/** @see CyphertextService */
		public readonly cyphertextService: CyphertextService
	) {}
}
