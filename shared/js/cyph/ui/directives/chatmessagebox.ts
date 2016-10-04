import {Enterpress} from 'enterpress';
import {Filechange} from 'filechange';
import {Templates} from 'ui/templates';


/**
 * Angular directive for chat message box.
 */
export class ChatMessageBox {
	/** Module/directive title. */
	public static title: string	= 'cyphChatMessageBox';

	private static _	= (() => {
		angular.module(
			ChatMessageBox.title,
			['ngMaterial', Enterpress.title, Filechange.title]
		).directive(ChatMessageBox.title, () => ({
			restrict: 'A',
			scope: {
				$this: '=' + ChatMessageBox.title
			},
			link: scope => scope['Cyph'] = self['Cyph'],
			template: Templates.chatMessageBox
		}));
	})();
}
