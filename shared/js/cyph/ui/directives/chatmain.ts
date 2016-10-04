import {Enterpress} from 'enterpress';
import {Filechange} from 'filechange';
import {Templates} from 'ui/templates';


/**
 * Angular directive for main chat UI.
 */
export class ChatMain {
	/** Module/directive title. */
	public static title: string	= 'cyphChatMain';

	private static _	= (() => {
		angular.module(
			ChatMain.title,
			['ngMaterial', Enterpress.title, Filechange.title]
		).directive(ChatMain.title, () => ({
			restrict: 'A',
			transclude: true,
			scope: {
				$this: '=' + ChatMain.title,
				hideDisconnectMessage: '='
			},
			link: scope => scope['Cyph'] = self['Cyph'],
			template: Templates.chatMain
		}));
	})();
}
