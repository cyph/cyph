import {Component} from '@angular/core';
import {ConfigService} from '../cyph/services/config.service';
import {EnvService} from '../cyph/services/env.service';
import {AppService} from './app.service';
import {DemoService} from './demo.service';
import {Promos, States} from './enums';


/**
 * Angular component for Cyph home page.
 */
@Component({
	selector: 'cyph-app',
	templateUrl: '../templates/cyph.com/index.html'
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
		public readonly envService: EnvService
	) {}
}
