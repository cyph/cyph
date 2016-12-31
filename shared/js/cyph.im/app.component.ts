import {Component} from '@angular/core';
import {Env, env} from '../cyph/env';
import {Strings, strings} from '../cyph/strings';
import {DialogManager} from '../cyph/ui/dialog-manager';
import {Notifier} from '../cyph/ui/notifier';
import {DialogService} from '../cyph/ui/services/dialog.service';
import {MdDialogService} from '../cyph/ui/services/material/md-dialog.service';
import {MdToastService} from '../cyph/ui/services/material/md-toast.service';
import {NotificationService} from '../cyph/ui/services/notification.service';
import {SignupService} from '../cyph/ui/services/signup.service';
import {VirtualKeyboardWatcherService} from '../cyph/ui/services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../cyph/ui/services/visibility-watcher.service';
import {States} from './enums';
import {UI} from './ui';


/**
 * Angular component for Cyph UI.
 */
@Component({
	providers: [
		DialogService,
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
	public ui: UI;

	/** @ignore */
	public env: Env					= env;

	/** @ignore */
	public states: typeof States	= States;

	/** @ignore */
	public strings: Strings			= strings;

	constructor (mdDialogService: MdDialogService, mdToastService: MdToastService) {
		this.ui	= new UI(
			new DialogManager(mdDialogService, mdToastService),
			new Notifier()
		);

		/* For testing and debugging */
		if (env.isWeb) {
			(<any> self).ui	= this.ui;
		}
	}
}
