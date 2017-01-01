import {Component, OnInit} from '@angular/core';
import {P2P} from '../cyph/p2p/p2p';
import {events} from '../cyph/session/enums';
import {strings} from '../cyph/strings';
import {States as ChatStates} from '../cyph/ui/chat/enums';
import {AbstractSessionIdService} from '../cyph/ui/services/abstract-session-id.service';
import {ChatService} from '../cyph/ui/services/chat.service';
import {CyphertextService} from '../cyph/ui/services/cyphertext.service';
import {DialogService} from '../cyph/ui/services/dialog.service';
import {EnvService} from '../cyph/ui/services/env.service';
import {FileService} from '../cyph/ui/services/file.service';
import {P2PService} from '../cyph/ui/services/p2p.service';
import {ScrollService} from '../cyph/ui/services/scroll.service';
import {SessionService} from '../cyph/ui/services/session.service';
import {urlState} from '../cyph/url-state';
import {util} from '../cyph/util';
import {AppService} from './app.service';
import {States, urlSections} from './enums';
import {SessionIdService} from './session-id.service';


/**
 * Angular component for chat UI root to share services.
 */
@Component({
	providers: [
		ChatService,
		CyphertextService,
		FileService,
		P2PService,
		ScrollService,
		SessionService,
		{
			provide: AbstractSessionIdService,
			useClass: SessionIdService
		}
	],
	selector: 'cyph-chat-root',
	templateUrl: '../../templates/chat-root.html'
})
export class ChatRootComponent implements OnInit {
	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (this.sessionService.apiFlags.modestBranding) {
			$(document.body).addClass('modest');
		}

		const urlSection		= urlState.getUrlSplit()[0];
		const initialCallType	=
			urlSection === urlSections.video || urlSection === urlSections.audio ?
				urlSection :
				''
		;

		let baseUrl: string	= this.envService.newCyphBaseUrl;

		if (initialCallType) {
			const newUrlState: string	= urlState.getUrl(true);
			if (newUrlState.split('/').slice(-1)[0] === initialCallType) {
				urlState.setUrl(newUrlState + '/', true, true);
			}

			baseUrl	= initialCallType === urlSections.video ?
				this.envService.cyphVideoBaseUrl :
				this.envService.cyphAudioBaseUrl
			;

			/* If unsupported, warn and then close window */
			if (!P2P.isSupported) {
				this.appService.state	= States.blank;

				await this.dialogService.alert({
					content: strings.p2pDisabledLocal,
					ok: strings.ok,
					title: strings.p2pTitle
				});

				self.close();

				return;
			}

			this.p2pService.preemptivelyInitiate();
		}


		this.sessionService.one(events.abort).then(() => {
			self.onbeforeunload		= () => {};
			this.appService.state	= States.chat;
		});

		this.sessionService.one(events.beginChatComplete).then(() => {
			self.onbeforeunload	= () => strings.disconnectWarning;

			if (initialCallType && this.sessionService.state.isAlice) {
				this.p2pService.p2p.request(initialCallType);
			}
		});

		this.sessionService.one(events.beginWaiting).then(() => {
			this.appService.linkConnectionBaseUrl	= baseUrl;
			this.appService.state					= States.waitingForFriend;
		});

		this.sessionService.one(events.connect).then(() => {
			this.appService.state	= States.chat;

			if (initialCallType) {
				this.dialogService.toast({
					content: initialCallType === urlSections.video ?
						strings.p2pWarningVideoPassive :
						strings.p2pWarningAudioPassive
					,
					delay: 5000
				});
			}
		});

		/* Cyphertext easter egg */
		/* tslint:disable-next-line:no-unused-new */
		new (<any> self).Konami(async () => {
			while (this.chatService.state !== ChatStates.chat) {
				await util.sleep();
			}

			this.cyphertextService.show();
		});

		/* For automated tests */
		if (this.envService.isWeb) {
			(<any> self).sendMessage	=
				(message: string) => this.chatService.send(message)
			;
		}
	}

	constructor (
		/** @ignore */
		private readonly appService: AppService,

		/** @ignore */
		private readonly chatService: ChatService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly p2pService: P2PService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @see CyphertextService */
		public readonly cyphertextService: CyphertextService
	) {}
}
