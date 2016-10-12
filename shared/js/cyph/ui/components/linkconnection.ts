import {Timer} from './timer';
import {ILinkConnection} from '../ilinkconnection';
import {Templates} from '../templates';


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
		angular.module(LinkConnection.title, [
			Timer.title
		]).component(LinkConnection.title, {
			bindings: {
				self: '<'
			},
			controller: LinkConnection,
			template: Templates.linkConnection
		});
	})();
}
