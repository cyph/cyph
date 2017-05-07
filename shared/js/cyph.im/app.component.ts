import {Component} from '@angular/core';
import {AppService} from './app.service';


/**
 * Angular component for Cyph web UI.
 */
@Component({
	selector: 'cyph-app',
	templateUrl: '../../templates/cyph.im/index.html'
})
export class AppComponent {
	constructor (
		/** @see AppService */
		public readonly appService: AppService
	) {}
}
