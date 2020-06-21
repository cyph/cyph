import {AfterViewInit, ChangeDetectionStrategy, Component} from '@angular/core';
import {Router} from '@angular/router';
import * as $ from 'jquery';
import * as Konami from 'konami';
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
export class EphemeralChatRootComponent extends BaseProvider
	implements AfterViewInit {
	/** @see ChatRootStates */
	public readonly chatRootStates = ChatRootStates;

	/** @see ChatStates */
	public readonly chatStates = ChatStates;

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		await sleep(0);

		this.appService.chatRootState.next(ChatRootStates.blank);

		const granimStates = {
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
			if (this.envService.isWeb) {
				$(document.body).addClass('modest');
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

		this.sessionService.aborted.promise.then(() => {
			if (this.destroyed.value) {
				return;
			}

			beforeUnloadMessage = undefined;
			this.appService.chatRootState.next(ChatRootStates.chat);
		});

		this.sessionService.beginChatComplete.promise.then(() => {
			if (this.destroyed.value) {
				return;
			}

			beforeUnloadMessage = this.stringsService.disconnectWarning;
		});

		this.sessionService.beginWaiting.promise.then(() => {
			if (this.destroyed.value) {
				return;
			}

			this.appService.chatRootState.next(ChatRootStates.waitingForFriend);
		});

		this.sessionService.channelConnected.promise.then(() => {
			if (this.destroyed.value) {
				return;
			}

			this.appService.chatRootState.next(ChatRootStates.chat);
		});

		this.sessionService.cyphNotFound.promise.then(() => {
			if (this.destroyed.value) {
				return;
			}

			this.appService.chatRootState.next(ChatRootStates.error);
			this.router.navigate([burnerRoot, '404']);
		});

		/* Cyphertext easter egg */

		if (!this.cyphertextService.isEnabled) {
			return;
		}

		/* eslint-disable-next-line no-unused-expressions */
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
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly router: Router,

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

		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		if (typeof document === 'object' && typeof document.body === 'object') {
			document.body.classList.remove('primary-account-theme');
		}
	}
}
