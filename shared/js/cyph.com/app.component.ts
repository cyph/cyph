import {Component} from '@angular/core';
import {ConfigService} from '../cyph/services/config.service';
import {EnvService} from '../cyph/services/env.service';
import {AppService} from './app.service';
import {DemoService} from './demo.service';


/**
 * Angular component for Cyph home page.
 */
@Component({
	selector: 'cyph-app',
	templateUrl: '../../templates/cyph.com/index.html'
})
export class AppComponent {
	constructor (
		/** @see AppService */
		public readonly appService: AppService,

		/** @see ConfigService */
		public readonly configService: ConfigService,

		/** @see DemoService */
		public readonly demoService: DemoService,

		/** @see EnvService */
		public readonly envService: EnvService
	) {}
}
