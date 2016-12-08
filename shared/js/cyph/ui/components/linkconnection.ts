import {Component, Input} from '@angular/core';
import {Env, env} from '../../env';
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
	public queuedMessageDraft: string	= '';

	/** @ignore */
	public env: Env	= env;

	constructor () {}
}
