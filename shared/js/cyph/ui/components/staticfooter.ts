import {Component, Input} from '@angular/core';
import {Env, env} from '../../env';
import {IChat} from '../chat/ichat';


/**
 * Angular component for static footer content.
 */
@Component({
	selector: 'cyph-static-footer',
	templateUrl: '../../../../templates/staticfooter.html'
})
export class StaticFooter {
	/** @ignore */
	@Input() public chat: IChat;

	/** @ignore */
	public coBranded: boolean	= coBranded;

	/** @ignore */
	public env: Env				= env;

	constructor () {}
}
