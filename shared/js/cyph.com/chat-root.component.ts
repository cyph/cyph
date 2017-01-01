import {Component, Input, OnInit} from '@angular/core';
import {ChatService} from '../cyph/ui/services/chat.service';
import {CyphertextService} from '../cyph/ui/services/cyphertext.service';
import {FileService} from '../cyph/ui/services/file.service';
import {P2PService} from '../cyph/ui/services/p2p.service';
import {ScrollService} from '../cyph/ui/services/scroll.service';
import {SessionService} from '../cyph/ui/services/session.service';
import {util} from '../cyph/util';
import {ChatData} from './chat-data';
import {LocalSessionService} from './local-session.service';


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
		{
			provide: SessionService,
			useClass: LocalSessionService
		}
	],
	selector: 'cyph-chat-root',
	templateUrl: '../../templates/chat-root.html'
})
export class ChatRootComponent implements OnInit {
	/** @see ChatData */
	@Input() public data: ChatData;

	/** @inheritDoc */
	public ngOnInit () : void {
		this.localSessionService.session	= this.data.session;

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
			await util.sleep();
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
		private readonly localSessionService: LocalSessionService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @see CyphertextService */
		public readonly cyphertextService: CyphertextService
	) {}
}
