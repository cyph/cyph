import {ILinkConnection} from 'ui/ilinkconnection';
import {Templates} from 'ui/templates';


/**
 * Angular component for link connection.
 */
export class LinkConnection {
	/** Module/component title. */
	public static title: string	= 'cyphLinkConnection';

	private Cyph: any	= self['Cyph'];

	private self: ILinkConnection;

	constructor () {}

	private static _	= (() => {
		angular.module(LinkConnection.title, []).component(LinkConnection.title, {
			bindings: {
				self: '<'
			},
			controller: LinkConnection,
			template: Templates.linkConnection,
			transclude: true
		});
	})();
}
