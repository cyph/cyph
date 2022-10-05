import {DOCUMENT} from '@angular/common';
import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	Inject,
	Optional
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import * as $ from 'jquery';
import * as Konami from 'konami';
import {firstValueFrom} from 'rxjs';
import {filter} from 'rxjs/operators';
import {fadeIn} from '../../../cyph/animations';
import {BaseProvider} from '../../../cyph/base-provider';
import {States as ChatStates} from '../../../cyph/chat/enums';
import {initGranim} from '../../../cyph/granim';
import {burnerChatProviders} from '../../../cyph/providers/burner-chat';
import {AffiliateService} from '../../../cyph/services/affiliate.service';
import {ChatService} from '../../../cyph/services/chat.service';
import {CyphertextService} from '../../../cyph/services/cyphertext.service';
import {DialogService} from '../../../cyph/services/dialog.service';
import {EnvService} from '../../../cyph/services/env.service';
import {FileTransferService} from '../../../cyph/services/file-transfer.service';
import {P2PWebRTCService} from '../../../cyph/services/p2p-webrtc.service';
import {P2PService} from '../../../cyph/services/p2p.service';
import {SalesService} from '../../../cyph/services/sales.service';
import {SessionInitService} from '../../../cyph/services/session-init.service';
import {SessionService} from '../../../cyph/services/session.service';
import {SplitTestingService} from '../../../cyph/services/split-testing.service';
import {StringsService} from '../../../cyph/services/strings.service';
import {UrlSessionInitService} from '../../../cyph/services/url-session-init.service';
import {WindowWatcherService} from '../../../cyph/services/window-watcher.service';
import {enableBackgroundMode} from '../../../cyph/util/background-mode';
import {filterUndefinedOperator} from '../../../cyph/util/filter';
import {random} from '../../../cyph/util/random';
import {sleep} from '../../../cyph/util/wait';
import {AppService} from '../../app.service';
import {ChatRootStates} from '../../enums';

/**
 * Angular component for chat UI root to share services.
 */
@Component({
	animations: [fadeIn],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		...burnerChatProviders,
		AffiliateService,
		{
			provide: SessionInitService,
			useClass: UrlSessionInitService
		}
	],
	selector: 'cyph-ephemeral-chat-root',
	styleUrls: ['./ephemeral-chat-root.component.scss'],
	templateUrl: './ephemeral-chat-root.component.html'
})
export class EphemeralChatRootComponent
	extends BaseProvider
	implements AfterViewInit
{
	/** @see ChatRootStates */
	public readonly chatRootStates = ChatRootStates;

	/** @see ChatStates */
	public readonly chatStates = ChatStates;

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		await sleep(0);

		enableBackgroundMode();

		if (this.activatedRoute.snapshot.data.groupTest === true) {
			this.appService.chatRootState.next(
				ChatRootStates.initializingGroup
			);
		}
		else {
			this.sessionInitService.ephemeralGroupMembers.resolve([]);
		}

		if (this.activatedRoute.snapshot.data.uiTest === true) {
			this.sessionService.channelConnected.resolve();
			await sleep(1000);
			this.sessionService.childChannelsConnected.resolve();
			await sleep(1000);
			this.sessionService.connected.resolve();
			await sleep(1000);
			this.sessionService.beginChat.resolve();

			if (this.sessionInitService.callType) {
				await firstValueFrom(
					this.p2pWebRTCService.webRTC.pipe(filterUndefinedOperator())
				);

				this.p2pWebRTCService.loading.next(false);

				const stream: MediaStream = await (async () => {
					if (
						!(
							this.document &&
							('captureStream' in HTMLVideoElement.prototype ||
								'mozCaptureStream' in
									HTMLVideoElement.prototype)
						)
					) {
						return new MediaStream();
					}

					const video = this.document.createElement('video');
					video.loop = true;
					video.muted = true;

					video.src = URL.createObjectURL(
						/* eslint-disable-next-line @typescript-eslint/tslint/config */
						await fetch(`${this.envService.baseUrl}test.webm`).then(
							async o => o.blob()
						)
					);

					await video.play();

					return 'captureStream' in HTMLVideoElement.prototype ?
						(<any> video).captureStream() :
						(<any> video).mozCaptureStream();
				})();

				this.p2pWebRTCService.incomingStreams.next([
					{
						...this.p2pWebRTCService.incomingStreams.value[0],
						activeVideo: true,
						stream
					}
				]);

				const setGroupSize = (n: number) => {
					this.p2pWebRTCService.incomingStreams.next(
						new Array(n).fill(
							this.p2pWebRTCService.incomingStreams.value[0]
						)
					);
				};

				const incrementGroupSize = () => {
					setGroupSize(
						this.p2pWebRTCService.incomingStreams.value.length + 1
					);
				};

				(<any> self).incrementGroupSize = incrementGroupSize;
				(<any> self).setGroupSize = setGroupSize;
			}
		}

		const granimStates = {
			/* eslint-disable-next-line @typescript-eslint/naming-convention */
			'default-state': !this.envService.telehealthTheme.value ?
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
				},
			'paused': !this.envService.telehealthTheme.value ?
				{
					gradients: [
							['#624599', '#8b62d9'],
							['#9368e6', '#624599']
						],
					transitionSpeed: 5000
				} :
				undefined
		};

		const granim = !this.envService.showGranim ?
			undefined :
			await initGranim({
				direction: 'radial',
				element: '#main-chat-gradient',
				isPausedWhenNotInView: true,
				name: 'basic-gradient',
				opacity: [1, 1],
				states: granimStates
			});

		if (granim) {
			(async () => {
				await sleep(random(5000));
				await this.windowWatcherService.waitUntilVisible();

				if (granimStates.paused) {
					granim.changeState('paused');
				}

				await sleep(3000);
				await this.windowWatcherService.waitUntilVisible();
				granim.pause();
			})();
		}

		if (this.sessionService.apiFlags.modestBranding) {
			if (this.envService.isWeb && this.document) {
				$(this.document.body).addClass('modest');
			}
			else {
				/* TODO: HANDLE NATIVE */
			}
		}

		if (this.sessionService.state.startingNewCyph.value !== true) {
			this.appService.isLockedDown.next(false);
		}

		/* If unsupported, warn and then close window */
		if (this.sessionInitService.callType && !P2PWebRTCService.isSupported) {
			await this.dialogService.alert({
				content: this.stringsService.p2pDisabledLocal,
				ok: this.stringsService.ok,
				title: this.stringsService.p2pTitle
			});

			self.close();

			return;
		}

		this.sessionService.aborted.then(() => {
			if (this.destroyed.value) {
				return;
			}

			beforeUnloadMessage = undefined;
			this.appService.chatRootState.next(ChatRootStates.chat);
		});

		this.sessionService.beginChatComplete.then(() => {
			if (this.destroyed.value) {
				return;
			}

			beforeUnloadMessage = this.stringsService.disconnectWarning;
		});

		this.sessionService.beginWaiting.then(() => {
			if (this.destroyed.value) {
				return;
			}

			this.appService.chatRootState.next(ChatRootStates.waitingForFriend);
		});

		this.sessionService.channelConnected.then(() => {
			if (this.destroyed.value) {
				return;
			}

			this.appService.chatRootState.next(ChatRootStates.chat);
		});

		this.sessionService.cyphNotFound.then(() => {
			if (this.destroyed.value) {
				return;
			}

			this.appService.chatRootState.next(ChatRootStates.error);
			this.router.navigate([burnerRoot, '404']);
		});

		firstValueFrom(
			this.sessionService.joinConfirmationWait.pipe(filter(b => b))
		).then(() => {
			if (this.destroyed.value) {
				return;
			}

			this.appService.chatRootState.next(ChatRootStates.waitingForFriend);
		});

		/* Cyphertext easter egg */

		if (!this.cyphertextService.isEnabled) {
			return;
		}

		new Konami(async () => {
			if (this.destroyed.value) {
				return;
			}

			while (this.chatService.chat.state !== ChatStates.chat) {
				await sleep();
			}

			this.cyphertextService.show();
		});
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		@Inject(DOCUMENT)
		@Optional()
		private readonly document: Document | undefined,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly p2pWebRTCService: P2PWebRTCService,

		/** @ignore */
		private readonly sessionInitService: SessionInitService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService,

		/** @see AffiliateService */
		public readonly affiliateService: AffiliateService,

		/** @see AppService */
		public readonly appService: AppService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see CyphertextService */
		public readonly cyphertextService: CyphertextService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see FileTransferService */
		public readonly fileTransferService: FileTransferService,

		/** @see P2PService */
		public readonly p2pService: P2PService,

		/** @see SalesService */
		public readonly salesService: SalesService,

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see SplitTestingService */
		public readonly splitTestingService: SplitTestingService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();

		this.document?.body.classList.remove('primary-account-theme');
	}
}
