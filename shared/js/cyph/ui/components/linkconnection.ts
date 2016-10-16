import {ILinkConnection} from '../ilinkconnection';
import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for link connection.
 */
export class LinkConnection {
	/** Component title. */
	public static title: string	= 'cyphLinkConnection';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<'
		},
		controller: LinkConnection,
		template: Templates.linkConnection
	};


	private Cyph: any;
	private self: ILinkConnection;

	constructor () { (async () => {
		while (!self['Cyph']) {
			await Util.sleep(100);
		}

		this.Cyph	= self['Cyph'];
	})(); }
}
