import {ChangeDetectionStrategy, Component} from '@angular/core';
import {AppService} from '../../app.service';
import {BaseProvider} from '../../js/cyph/base-provider';
import {EnvService} from '../../js/cyph/services/env.service';
import {StringsService} from '../../js/cyph/services/strings.service';

/**
 * Angular component for Cyph native UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-app',
	templateUrl: './app.component.html'
})
export class AppComponent extends BaseProvider {
	constructor (
		/** @see AppService */
		public readonly appService: AppService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
