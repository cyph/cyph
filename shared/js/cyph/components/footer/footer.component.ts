import {ChangeDetectionStrategy, Component, Inject, Input, Optional} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {EnvService} from '../../services/env.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for static footer content.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-footer',
	styleUrls: ['./footer.component.scss'],
	templateUrl: './footer.component.html'
})
export class FooterComponent extends BaseProvider {
	/** If true, will display a more limited version of the footer. */
	@Input() public limited: boolean	= false;

	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SessionService */
		@Inject(SessionService) @Optional()
		public readonly sessionService: SessionService|undefined,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
