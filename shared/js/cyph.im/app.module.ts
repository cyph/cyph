import {ErrorHandler, NgModule} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {DialogAlertComponent} from '../cyph/components/dialog-alert.component';
import {DialogConfirmComponent} from '../cyph/components/dialog-confirm.component';
import {HelpComponent} from '../cyph/components/help.component';
import {CyphAppModule} from '../cyph/modules/cyph-app.module';
import {CyphCommonModule} from '../cyph/modules/cyph-common.module';
import {CyphWebModule} from '../cyph/modules/cyph-web.module';
import {AnalyticsService} from '../cyph/services/analytics.service';
import {ConfigService} from '../cyph/services/config.service';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {ThreadedPotassiumService} from '../cyph/services/crypto/threaded-potassium.service';
import {DatabaseService} from '../cyph/services/database.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {ErrorService} from '../cyph/services/error.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {FileService} from '../cyph/services/file.service';
import {FirebaseDatabaseService} from '../cyph/services/firebase-database.service';
import {NotificationService} from '../cyph/services/notification.service';
import {SignupService} from '../cyph/services/signup.service';
import {StringsService} from '../cyph/services/strings.service';
import {UrlStateService} from '../cyph/services/url-state.service';
import {UtilService} from '../cyph/services/util.service';
import {VirtualKeyboardWatcherService} from '../cyph/services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from '../cyph/services/visibility-watcher.service';
import {AccountComponent} from './account.component';
import {AppComponent} from './app.component';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';
import {LockdownComponent} from './lockdown.component';


/**
 * Angular module for Cyph UI.
 */
@NgModule({
	bootstrap: [AppComponent],
	declarations: [
		AccountComponent,
		AppComponent,
		EphemeralChatRootComponent,
		LockdownComponent
	],
	entryComponents: [
		DialogAlertComponent,
		DialogConfirmComponent,
		HelpComponent
	],
	imports: [
		CyphAppModule,
		CyphCommonModule,
		CyphWebModule
	],
	providers: [
		AnalyticsService,
		ConfigService,
		DialogService,
		EnvService,
		ErrorService,
		FaviconService,
		FileService,
		NotificationService,
		SignupService,
		StringsService,
		Title,
		UrlStateService,
		UtilService,
		VirtualKeyboardWatcherService,
		VisibilityWatcherService,
		{
			provide: DatabaseService,
			useClass: FirebaseDatabaseService
		},
		{
			provide: ErrorHandler,
			useExisting: ErrorService
		},
		{
			provide: PotassiumService,
			useClass: ThreadedPotassiumService
		}
	]
})
/* tslint:disable-next-line:no-stateless-class */
export class AppModule {
	constructor () {}
}
