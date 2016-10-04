import {Templates} from 'ui/templates';


/**
 * Angular component for chat cyphertext UI.
 */
export class ChatCyphertext {
	/** Module/component title. */
	public static title: string	= 'cyphChatCyphertext';

	private static _	= (() => {
		angular.module(
			ChatCyphertext.title,
			['ngMaterial']
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
