import {Templates} from 'ui/templates';


/**
 * Angular component for chat toolbar.
 */
export class ChatToolbar {
	/** Module/component title. */
	public static title: string	= 'cyphChatToolbar';

	private static _	= (() => {
		angular.module(
			ChatToolbar.title,
			['ngMaterial']
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
