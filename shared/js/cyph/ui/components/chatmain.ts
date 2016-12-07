import {Component, Input} from '@angular/core';
import {Util} from '../../util';
import {IChat} from '../chat/ichat';


/**
 * Angular component for main chat UI.
 */
@Component({
	selector: 'cyph-chat-main',
	templateUrl: '../../../../templates/chatmain.html'
})
export class ChatMain {
	/** @ignore */
	@Input() public self: IChat;

	/** @ignore */
	@Input() public hideDisconnectMessage: boolean;

	/** @ignore */
	public cyph: any;

	constructor () { (async () => {
		while (!cyph) {
			await Util.sleep();
		}

		this.cyph	= cyph;
	})(); }
}
