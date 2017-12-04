import {ChangeDetectionStrategy, Component} from '@angular/core';
import {EnvService} from '../services/env.service';
import {SessionService} from '../services/session.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for static footer content.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-footer',
	styleUrls: ['../../../css/components/footer.scss'],
	templateUrl: '../../../templates/footer.html'
})
export class FooterComponent {
	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
