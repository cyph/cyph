import {Templates} from '../templates';
import {IChat} from '../chat/ichat';
import {Util} from '../../util';


/**
 * Angular component for chat toolbar.
 */
export class ChatToolbar {
	/** Module/component title. */
	public static title: string	= 'cyphChatToolbar';

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
