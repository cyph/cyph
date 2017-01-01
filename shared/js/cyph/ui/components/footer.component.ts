import {Component} from '@angular/core';
import {EnvService} from '../services/env.service';
import {SessionService} from '../services/session.service';


/**
 * Angular component for static footer content.
 */
@Component({
	selector: 'cyph-footer',
	templateUrl: '../../../../templates/footer.html'
})
export class FooterComponent {
	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SessionService */
		public readonly sessionService: SessionService
	) {}
}
