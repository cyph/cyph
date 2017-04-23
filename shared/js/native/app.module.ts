import {NgModule, NO_ERRORS_SCHEMA} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {NativeScriptModule} from 'nativescript-angular/nativescript.module';
import {AccountComponent} from './account.component';
import {AppComponent} from './app.component';
import {EphemeralChatRootComponent} from './ephemeral-chat-root.component';
import {HelpComponent} from './js/cyph/components/help.component';
import {CyphAppModule} from './js/cyph/modules/cyph-app.module';
import {CyphCommonModule} from './js/cyph/modules/cyph-common.module';
import {ConfigService} from './js/cyph/services/config.service';
import {DialogService} from './js/cyph/services/dialog.service';
import {EnvService} from './js/cyph/services/env.service';
import {FileService} from './js/cyph/services/file.service';
import {NotificationService} from './js/cyph/services/notification.service';
import {SignupService} from './js/cyph/services/signup.service';
import {StringsService} from './js/cyph/services/strings.service';
import {VirtualKeyboardWatcherService} from './js/cyph/services/virtual-keyboard-watcher.service';
import {VisibilityWatcherService} from './js/cyph/services/visibility-watcher.service';


/**
 * Angular module for Cyph UI.
 */
@NgModule({
	bootstrap: [AppComponent],
	declarations: [
		AccountComponent,
		AppComponent,
		EphemeralChatRootComponent
	],
	entryComponents: [HelpComponent],
	imports: [
		CyphAppModule,
		CyphCommonModule,
		NativeScriptModule
	],
	providers: [
		ConfigService,
		DialogService,
		EnvService,
		FileService,
		NotificationService,
		SignupService,
		StringsService,
		Title,
		VirtualKeyboardWatcherService,
		VisibilityWatcherService
	],
	schemas: [NO_ERRORS_SCHEMA]
})
/* tslint:disable-next-line:no-stateless-class */
export class AppModule {
	constructor () {}
}
