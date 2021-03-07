import {PreloadAllModules, RouterModule, UrlSerializer} from '@angular/router';
import {CyphAppModule} from '../cyph/modules/cyph-app.module';
import {FaviconService} from '../cyph/services/favicon.service';
import {appRoutes} from './app-routes';
import {AppService} from './app.service';
import {AppComponent} from './components/app';
import {EphemeralChatRootComponent} from './components/ephemeral-chat-root';
import {LockdownComponent} from './components/lockdown';
import {SignupConfirmComponent} from './components/signup-confirm';
import {CustomUrlSerializer} from './custom-url-serializer';

/** @see NgModule.bootstrap */
export const bootstrap = [AppComponent];

/** @see NgModule.declarations */
export const declarations = [
	AppComponent,
	EphemeralChatRootComponent,
	LockdownComponent,
	SignupConfirmComponent
];

/** @see NgModule.imports */
export const imports = [
	RouterModule.forRoot(appRoutes, {
		onSameUrlNavigation: 'reload',
		preloadingStrategy: PreloadAllModules,
		useHash: true
	}),
	CyphAppModule
];

/** @see NgModule.providers */
export const providers = [
	AppService,
	FaviconService,
	{
		provide: UrlSerializer,
		useClass: CustomUrlSerializer
	}
];
