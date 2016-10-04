import {Enterpress} from 'directives/enterpress';
import {Filechange} from 'directives/filechange';
import {Templates} from 'ui/templates';


/**
 * Angular component for chat message box.
 */
export class ChatMessageBox {
	/** Module/component title. */
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
