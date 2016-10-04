import {Enterpress} from 'enterpress';
import {Filechange} from 'filechange';
import {Templates} from 'ui/templates';


/**
 * Angular directive for chat cyphertext UI.
 */
export class ChatCyphertext {
	/** Module/directive title. */
	public static title: string	= 'cyphChatCyphertext';

	private static _	= (() => {
		angular.module(
			ChatCyphertext.title,
			['ngMaterial', Enterpress.title, Filechange.title]
		).directive(ChatCyphertext.title, () => ({
			restrict: 'A',
			scope: {
				$this: '=' + ChatCyphertext.title
			},
			link: scope => scope['Cyph'] = self['Cyph'],
			template: Templates.chatCyphertext
		}));
	})();
}
