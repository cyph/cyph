import {Component} from '@angular/core';
import {ConfigService} from '../../../cyph/services/config.service';
import {EnvService} from '../../../cyph/services/env.service';
import {SignupService} from '../../../cyph/services/signup.service';
import {StringsService} from '../../../cyph/services/strings.service';
import {AppService} from '../../app.service';
import {DemoService} from '../../demo.service';
import {Promos, States} from '../../enums';


/**
 * Angular component for Cyph home page.
 */
@Component({
	selector: 'cyph-app',
	templateUrl: './app.component.html'
})
export class AppComponent {
	/** @see Promos */
	public promos: typeof Promos	= Promos;

	/** @see States */
	public states: typeof States	= States;

	constructor (
		/** @see AppService */
		public readonly appService: AppService,

		/** @see ConfigService */
		public readonly configService: ConfigService,

		/** @see DemoService */
		public readonly demoService: DemoService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SignupService */
		public readonly signupService: SignupService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
