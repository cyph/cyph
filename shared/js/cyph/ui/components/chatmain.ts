import {Templates} from 'ui/templates';


/**
 * Angular component for main chat UI.
 */
export class ChatMain {
	/** Module/component title. */
	public static title: string	= 'cyphChatMain';

	private static _	= (() => {
		angular.module(
			ChatMain.title,
			['ngMaterial']
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
