import {Component} from '@angular/core';
import {ChatService} from '../services/chat.service';
import {FileService} from '../services/file.service';
import {P2PService} from '../services/p2p.service';
import {ScrollService} from '../services/scroll.service';
import {SessionService} from '../services/session.service';


/**
 * Angular component for chat UI root to share services.
 */
@Component({
	providers: [
		ChatService,
		FileService,
		P2PService,
		ScrollService,
		SessionService
	],
	selector: 'cyph-chat-root',
	templateUrl: '../../../../templates/chat-root.html'
})
/* tslint:disable-next-line:no-stateless-class */
export class ChatRootComponent {
	constructor () {}
}
