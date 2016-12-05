import {Component, Input} from '@angular/core';
import {Util} from '../../util';
import {IChat} from '../chat/ichat';


/**
 * Angular component for chat cyphertext UI.
 */
@Component({
	selector: 'cyph-chat-cyphertext',
	templateUrl: '../../../../templates/chatcyphertext.html'
})
export class ChatCyphertext {
	/** @ignore */
	@Input() public self: IChat;

	/** @ignore */
	public cyph: any;

	/** @ignore */
	public ui: any;

	constructor () { (async () => {
		while (!cyph || !ui) {
			await Util.sleep();
		}

		this.cyph	= cyph;
		this.ui		= ui;
	})(); }
}
