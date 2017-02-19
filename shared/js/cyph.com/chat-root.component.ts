import {Component, Input, OnInit} from '@angular/core';
import {ChatService} from '../cyph/services/chat.service';
import {CyphertextService} from '../cyph/services/cyphertext.service';
import {EnvService} from '../cyph/services/env.service';
import {FileTransferService} from '../cyph/services/file-transfer.service';
import {P2PService} from '../cyph/services/p2p.service';
import {ScrollService} from '../cyph/services/scroll.service';
import {SessionService} from '../cyph/services/session.service';
import {ChatData} from './chat-data';
import {LocalSessionService} from './local-session.service';


/**
 * Angular component for chat UI root to share services.
 */
@Component({
	providers: [
		ChatService,
		CyphertextService,
		EnvService,
		FileTransferService,
		LocalSessionService,
		P2PService,
		ScrollService,
		{
			provide: SessionService,
			useExisting: LocalSessionService
		}
	],
	selector: 'cyph-chat-root',
	templateUrl: '../../templates/chat-root.html'
})
export class ChatRootComponent implements OnInit {
	/** @see ChatData */
	@Input() public data: ChatData;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.envService.isMobile	= this.data.isMobile;

		this.localSessionService.init(this.data);

		this.data.message.subscribe(s => {
			if (s.length === 1) {
				this.chatService.currentMessage += s;
			}
			else if (s.length > 1) {
				this.chatService.send(s);
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
	}

	constructor (
		/** @ignore */
		private readonly chatService: ChatService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly localSessionService: LocalSessionService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @see CyphertextService */
		public readonly cyphertextService: CyphertextService
	) {}
}
