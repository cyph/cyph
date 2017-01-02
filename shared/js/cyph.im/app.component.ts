import {Component} from '@angular/core';
import {ConfigService} from '../cyph/ui/services/config.service';
import {DialogService} from '../cyph/ui/services/dialog.service';
import {EnvService} from '../cyph/ui/services/env.service';
import {NotificationService} from '../cyph/ui/services/notification.service';
import {SignupService} from '../cyph/ui/services/signup.service';
import {StringsService} from '../cyph/ui/services/strings.service';
import {UrlStateService} from '../cyph/ui/services/url-state.service';
import {VirtualKeyboardWatcherService} from '../cyph/ui/services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../cyph/ui/services/visibility-watcher.service';
import {AppService} from './app.service';


/**
 * Angular component for Cyph UI.
 */
@Component({
	providers: [
		AppService,
		ConfigService,
		DialogService,
		EnvService,
		NotificationService,
		SignupService,
		StringsService,
		UrlStateService,
		VirtualKeyboardWatcherService,
		VisibilityWatcherService
	],
	selector: 'cyph-app',
	templateUrl: '../../templates/cyph.im/index.html'
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
