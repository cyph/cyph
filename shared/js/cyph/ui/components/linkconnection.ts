import {Component, Input} from '@angular/core';
import {Util} from '../../util';
import {ILinkConnection} from '../ilinkconnection';


/**
 * Angular component for link connection.
 */
@Component({
	selector: 'cyph-link-connection',
	templateUrl: '../../../../templates/linkconnection.html'
})
export class LinkConnection {
	/** @ignore */
	@Input() public self: ILinkConnection;

	/** @ignore */
	@Input() public enableAdvancedFeatures: boolean;

	/** @ignore */
	public cyph: any;

	/** @ignore */
	public queuedMessageDraft: string		= '';

	constructor () { (async () => {
		while (!cyph) {
			await Util.sleep();
		}

		this.cyph	= cyph;
	})(); }
}
