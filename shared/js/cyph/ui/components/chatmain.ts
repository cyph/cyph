import {Templates} from '../templates';
import {IChat} from '../chat/ichat';
import {Util} from '../../util';


/**
 * Angular component for main chat UI.
 */
export class ChatMain {
	/** Module/component title. */
	public static title: string	= 'cyphChatMain';

	private Cyph: any;
	private self: IChat;
	private hideDisconnectMessage: boolean;

	constructor () { (async () => {
		while (!self['Cyph']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
	})(); }

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
