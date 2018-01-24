import {Component} from '@angular/core';
import {AppService} from '../../app.service';
import {EnvService} from '../../js/cyph/services/env.service';
import {StringsService} from '../../js/cyph/services/strings.service';


/**
 * Angular component for Cyph native UI.
 */
@Component({
	selector: 'cyph-app',
	templateUrl: './app.component.html'
})
export class AppComponent {
	constructor (
		/** @see AppService */
		public readonly appService: AppService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
