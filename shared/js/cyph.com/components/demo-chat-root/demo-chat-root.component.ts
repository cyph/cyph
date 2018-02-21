import {Component, Input, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import * as Konami from 'konami-code.js';
import {env} from '../../../cyph/env';
import {ChatMessageGeometryService} from '../../../cyph/services/chat-message-geometry.service';
import {ChatService} from '../../../cyph/services/chat.service';
import {CyphertextService} from '../../../cyph/services/cyphertext.service';
import {EnvService} from '../../../cyph/services/env.service';
import {FileTransferService} from '../../../cyph/services/file-transfer.service';
import {P2PWebRTCService} from '../../../cyph/services/p2p-webrtc.service';
import {P2PService} from '../../../cyph/services/p2p.service';
import {ScrollService} from '../../../cyph/services/scroll.service';
import {SessionCapabilitiesService} from '../../../cyph/services/session-capabilities.service';
import {SessionInitService} from '../../../cyph/services/session-init.service';
import {SessionService} from '../../../cyph/services/session.service';
import {sleep} from '../../../cyph/util/wait';
import {ChatData} from '../../chat-data';
import {DemoEnvService} from '../../demo-env.service';
import {DemoService} from '../../demo.service';
import {HomeSections} from '../../enums';
import {LocalSessionService} from '../../local-session.service';


/**
 * Angular component for chat UI root to share services.
 */
@Component({
	providers: [
		ChatMessageGeometryService,
		ChatService,
		CyphertextService,
		DemoEnvService,
		FileTransferService,
		LocalSessionService,
		P2PService,
		P2PWebRTCService,
		ScrollService,
		SessionCapabilitiesService,
		SessionInitService,
		{
			provide: EnvService,
			useExisting: DemoEnvService
		},
		{
			provide: SessionService,
			useExisting: LocalSessionService
		}
	],
	selector: 'cyph-demo-chat-root',
	templateUrl: './demo-chat-root.component.html'
})
export class DemoChatRootComponent implements OnInit {
	/** @see ChatData */
	@Input() public data?: ChatData;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.data) {
			return;
		}

		this.demoEnvService.init(this.data);
		this.localSessionService.initChatData(this.data);

		this.data.message.subscribe(s => {
			if (this.chatService.chat.currentMessage.text === undefined) {
				this.chatService.chat.currentMessage.text	= '';
			}

			if (s.length === 1) {
				this.chatService.chat.currentMessage.text += s;
			}
			else if (s.length > 1) {
				this.chatService.send(undefined, {text: s});
			}
			else {
				this.chatService.send();
			}
		});

		this.data.scrollDown.subscribe(async () => {
			this.scrollService.scrollDown();
		});

		this.data.showCyphertext.subscribe(() => {
			this.cyphertextService.show();
		});

		/* Cyphertext easter egg */
		if (this.cyphertextService.isEnabled) {
			/* tslint:disable-next-line:no-unused-expression */
			new Konami(async () => {
				this.router.navigate([HomeSections[HomeSections.intro]]);

				while (!this.demoService.isActive) {
					await sleep();
				}

				if (env.isMobile) {
					this.demoService.mobile.showCyphertext.next();
				}
				else {
					this.demoService.desktop.showCyphertext.next();
					await sleep(8000);
					this.demoService.mobile.showCyphertext.next();
				}
			});
		}
	}

	constructor (
		/** @ignore */
		private readonly chatService: ChatService,

		/** @ignore */
		private readonly demoService: DemoService,

		/** @ignore */
		private readonly demoEnvService: DemoEnvService,

		/** @ignore */
		private readonly localSessionService: LocalSessionService,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @see CyphertextService */
		public readonly cyphertextService: CyphertextService
	) {}
}
