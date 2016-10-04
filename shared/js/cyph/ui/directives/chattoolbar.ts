import {Enterpress} from 'enterpress';
import {Filechange} from 'filechange';
import {Templates} from 'ui/templates';


/**
 * Angular directive for chat toolbar.
 */
export class ChatToolbar {
	/** Module/directive title. */
	public static title: string	= 'cyphChatToolbar';

	private static _	= (() => {
		angular.module(
			ChatToolbar.title,
			['ngMaterial', Enterpress.title, Filechange.title]
		).directive(ChatToolbar.title, () => ({
			restrict: 'A',
				scope: {
					$this: '=' + ChatToolbar.title,
					showChat: '='
				},
				link: scope => scope['Cyph'] = self['Cyph'],
				template: Templates.chatToolbar
		}));
	})();
}
