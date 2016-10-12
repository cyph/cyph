import {FileInput} from './fileinput';
import {Templates} from '../templates';
import {IChat} from '../chat/ichat';
import {Enterpress} from '../directives/enterpress';


/**
 * Angular component for chat message box.
 */
export class ChatMessageBox {
	/** Module/component title. */
	public static title: string	= 'cyphChatMessageBox';

	private Cyph: any	= self['Cyph'];

	private self: IChat;

	constructor () {}

	private static _	= (() => {
		angular.module(
			ChatMessageBox.title,
			['ngMaterial', Enterpress.title, FileInput.title]
		).component(ChatMessageBox.title, {
			bindings: {
				self: '<'
			},
			controller: ChatMessageBox,
			template: Templates.chatMessageBox
		});
	})();
}
