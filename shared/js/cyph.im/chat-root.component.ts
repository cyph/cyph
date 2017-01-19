import {Component, OnInit} from '@angular/core';
import * as $ from 'jquery';
import * as Konami from 'konami-code.js';
import {AbstractSessionInitService} from '../cyph/services/abstract-session-init.service';
import {ChatEnvService} from '../cyph/services/chat-env.service';
import {ChatStringsService} from '../cyph/services/chat-strings.service';
import {ChatService} from '../cyph/services/chat.service';
import {CyphertextService} from '../cyph/services/cyphertext.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {FileService} from '../cyph/services/file.service';
import {P2PService} from '../cyph/services/p2p.service';
import {ScrollService} from '../cyph/services/scroll.service';
import {SessionService} from '../cyph/services/session.service';
import {StringsService} from '../cyph/services/strings.service';
import {UrlStateService} from '../cyph/services/url-state.service';
import {util} from '../cyph/util';
import {AppService} from './app.service';
import {States} from './enums';
import {SessionInitService} from './session-init.service';


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
			provide: AbstractSessionInitService,
			useClass: SessionInitService
		},
		{
			provide: EnvService,
			useClass: ChatEnvService
		},
		{
			provide: StringsService,
			useClass: ChatStringsService
		}
	],
	selector: 'cyph-chat-root',
	templateUrl: '../../templates/chat-root.html'
})
export class ChatRootComponent implements OnInit {
	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
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
			}
			else {
				/* TODO: HANDLE NATIVE */
			}
		}

		this.urlStateService.setUrl(
			this.envService.newCyphUrl.split(locationData.host).slice(-1)[0].replace(/\/$/, ''),
			true,
			true
		);

		if (this.abstractSessionInitService.callType) {
			/* If unsupported, warn and then close window */
			if (!this.p2pService.isSupported) {
				this.appService.state	= States.blank;

				await this.dialogService.alert({
					content: this.stringsService.p2pDisabledLocal,
					ok: this.stringsService.ok,
					title: this.stringsService.p2pTitle
				});

				self.close();

				return;
			}

			this.p2pService.preemptivelyInitiate();
		}


		this.sessionService.one(this.sessionService.events.abort).then(() => {
			self.onbeforeunload		= () => {};
			this.appService.state	= States.chat;
		});

		this.sessionService.one(this.sessionService.events.beginChatComplete).then(() => {
			self.onbeforeunload	= () => this.stringsService.disconnectWarning;

			if (this.abstractSessionInitService.callType && this.sessionService.state.isAlice) {
				this.p2pService.p2p.request(this.abstractSessionInitService.callType);
			}
		});

		this.sessionService.one(this.sessionService.events.beginWaiting).then(() => {
			this.appService.state	= States.waitingForFriend;
		});

		this.sessionService.one(this.sessionService.events.connect).then(() => {
			this.appService.state	= States.chat;

			if (this.abstractSessionInitService.callType) {
				this.dialogService.toast({
					content: this.abstractSessionInitService.callType === 'video' ?
						this.stringsService.p2pWarningVideoPassive :
						this.stringsService.p2pWarningAudioPassive
					,
					delay: 5000
				});
			}
		});

		this.sessionService.one(this.sessionService.events.cyphNotFound).then(() => {
			this.urlStateService.setUrl(this.urlStateService.states.notFound);
		});

		/* Cyphertext easter egg */
		/* tslint:disable-next-line:no-unused-new */
		new Konami(async () => {
			while (this.chatService.state !== this.chatService.states.chat) {
				await util.sleep();
			}

			this.cyphertextService.show();
		});

		/* For automated tests */
		if (this.envService.isWeb) {
			(<any> self).sendMessage	=
				(message: string) => { this.chatService.send(message); }
			;
		}
	}

	constructor (
		/** @ignore */
		private readonly abstractSessionInitService: AbstractSessionInitService,

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

		/** @ignore */
		private readonly stringsService: StringsService,

		/** @ignore */
		private readonly urlStateService: UrlStateService,

		/** @see CyphertextService */
		public readonly cyphertextService: CyphertextService
	) {}
}
