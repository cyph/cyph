import {Enterpress} from 'enterpress';
import {Filechange} from 'filechange';
import {Templates} from 'ui/templates';


/**
 * Angular namespace with directives for chat UI components.
 */
export class Chat {
	/** Module title + namespace for included directives. */
	public static title: string	= 'cyphChat';

	private static _	= (() => {
		const titles	= {
			cyphertext: Chat.title + 'Cyphertext',
			main: Chat.title + 'Main',
			messageBox: Chat.title + 'MessageBox',
			sidebar: Chat.title + 'Sidebar',
			toolbar: Chat.title + 'Toolbar'
		};

		angular.
			module(Chat.title, [
				'ngMaterial',
				Enterpress.title,
				Filechange.title
			]).
			directive(titles.cyphertext, () => ({
				restrict: 'A',
				scope: {
					$this: '=' + titles.cyphertext
				},
				link: scope => scope['Cyph'] = self['Cyph'],
				template: Templates.chatCyphertext
			})).
			directive(titles.main, () => ({
				restrict: 'A',
				transclude: true,
				scope: {
					$this: '=' + titles.main,
					hideDisconnectMessage: '='
				},
				link: scope => scope['Cyph'] = self['Cyph'],
				template: Templates.chatMain
			})).
			directive(titles.messageBox, () => ({
				restrict: 'A',
				scope: {
					$this: '=' + titles.messageBox
				},
				link: scope => scope['Cyph'] = self['Cyph'],
				template: Templates.chatMessageBox
			})).
			directive(titles.toolbar, () => ({
				restrict: 'A',
				scope: {
					$this: '=' + titles.toolbar,
					showChat: '='
				},
				link: scope => scope['Cyph'] = self['Cyph'],
				template: Templates.chatToolbar
			}))
		;
	})();
}
