import {Templates} from '../templates';
import {IChat} from '../chat/ichat';


/**
 * Angular component for main chat UI.
 */
export class ChatMain {
	/** Module/component title. */
	public static title: string	= 'cyphChatMain';

	private Cyph: any	= self['Cyph'];

	private self: IChat;
	private hideDisconnectMessage: boolean;

	constructor () {}

	private static _	= (() => {
		angular.module(
			ChatMain.title,
			['ngMaterial']
		).component(ChatMain.title, {
			bindings: {
				self: '<',
				hideDisconnectMessage: '<'
			},
			controller: ChatMain,
			template: Templates.chatMain,
			transclude: true
		});
	})();
}
