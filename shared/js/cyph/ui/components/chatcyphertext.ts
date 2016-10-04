import {Templates} from 'ui/templates';
import {IChat} from 'chat/ichat';


/**
 * Angular component for chat cyphertext UI.
 */
export class ChatCyphertext {
	/** Module/component title. */
	public static title: string	= 'cyphChatCyphertext';

	private Cyph: any	= self['Cyph'];

	private self: IChat;

	constructor () {}

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
