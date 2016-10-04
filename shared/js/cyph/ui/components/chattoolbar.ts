import {Templates} from '../templates';
import {IChat} from '../chat/ichat';


/**
 * Angular component for chat toolbar.
 */
export class ChatToolbar {
	/** Module/component title. */
	public static title: string	= 'cyphChatToolbar';

	private Cyph: any	= self['Cyph'];

	private self: IChat;

	constructor () {}

	private static _	= (() => {
		angular.module(
			ChatToolbar.title,
			['ngMaterial']
		).component(ChatToolbar.title, {
			bindings: {
				self: '<'
			},
			controller: ChatToolbar,
			template: Templates.chatToolbar
		});
	})();
}
