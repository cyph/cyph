import {Templates} from 'ui/templates';


/**
 * Angular component for link connection.
 */
export class LinkConnection {
	/** Module/component title. */
	public static title: string	= 'cyphLinkConnection';

	private static _	= (() => {
		angular.module(LinkConnection.title, []).directive(LinkConnection.title, () => ({
			restrict: 'A',
			transclude: true,
			scope: {
				$this: '=' + LinkConnection.title
			},
			link: scope => scope['Cyph'] = self['Cyph'],
			template: Templates.linkConnection
		}));
	})();
}
