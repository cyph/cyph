import {ChangeDetectionStrategy, Component} from '@angular/core';
import {EnvService} from '../services/env.service';
import {SessionService} from '../services/session.service';


/**
 * Angular component for static footer content.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-footer',
	styleUrls: ['../../css/components/footer.css'],
	templateUrl: '../../templates/footer.html'
})
export class FooterComponent {
	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SessionService */
		public readonly sessionService: SessionService
	) {}
}
