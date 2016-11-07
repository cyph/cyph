import {Templates} from '../templates';
import {IChat} from '../chat/ichat';
import {Util} from '../../util';


/**
 * Angular component for chat cyphertext UI.
 */
export class ChatCyphertext {
	/** Module/component title. */
	public static title: string	= 'cyphChatCyphertext';

	private Cyph: any;
	private self: IChat;

	constructor () { (async () => {
		while (!self['Cyph']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
	})(); }

	private static _	= (() => {
		angular.module(
			ChatCyphertext.title,
			['ngMaterial']
		).component(ChatCyphertext.title, {
			bindings: {
				self: '<'
			},
			controller: ChatCyphertext,
			template: Templates.chatCyphertext
		});
	})();
}
