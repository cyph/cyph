import {ILinkConnection} from '../ilinkconnection';
import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for link connection.
 */
export class LinkConnection {
	/** Module/component title. */
	public static title: string	= 'cyphLinkConnection';

	private Cyph: any;
	private self: ILinkConnection;

	constructor () { (async () => {
		while (!self['Cyph']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
	})(); }

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
