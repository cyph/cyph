import {Component} from '@angular/core';
import {Strings, strings} from '../cyph/strings';
import {DialogService} from '../cyph/ui/services/dialog.service';
import {EnvService} from '../cyph/ui/services/env.service';
import {NotificationService} from '../cyph/ui/services/notification.service';
import {SignupService} from '../cyph/ui/services/signup.service';
import {VirtualKeyboardWatcherService} from '../cyph/ui/services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../cyph/ui/services/visibility-watcher.service';
import {AppService} from './app.service';
import {States} from './enums';


/**
 * Angular component for Cyph UI.
 */
@Component({
	providers: [
		AppService,
		DialogService,
		EnvService,
		NotificationService,
		SignupService,
		VirtualKeyboardWatcherService,
		VisibilityWatcherService
	],
	selector: 'cyph-app',
	templateUrl: '../../templates/cyph.im/index.html'
})
export class AppComponent {
	/** @ignore */
	public states: typeof States	= States;

	/** @ignore */
	public strings: Strings			= strings;

	constructor (
		/** @see AppService */
		public appService: AppService,

		/** @see EnvService */
		public envService: EnvService
	) {}
}
