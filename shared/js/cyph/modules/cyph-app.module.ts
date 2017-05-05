import {NgModule} from '@angular/core';
import {AccountContactsComponent} from '../components/account-contacts.component';
import {AccountLoginComponent} from '../components/account-login.component';
import {AccountProfileComponent} from '../components/account-profile.component';
import {AccountRegisterComponent} from '../components/account-register.component';
import {AccountSettingsComponent} from '../components/account-settings.component';
import {FooterComponent} from '../components/footer.component';
import {LinkConnectionComponent} from '../components/link-connection.component';
import {NotFoundComponent} from '../components/not-found.component';
import {DatabaseService} from '../services/database.service';
import {FirebaseDatabaseService} from '../services/firebase-database.service';
import {CyphWebModule} from './cyph-web.module';


/**
 * Common module with shared imports for application projects.
 */
@NgModule({
	declarations: [
		AccountContactsComponent,
		AccountLoginComponent,
		AccountProfileComponent,
		AccountRegisterComponent,
		AccountSettingsComponent,
		FooterComponent,
		LinkConnectionComponent,
		NotFoundComponent
	],
	exports: [
		AccountContactsComponent,
		AccountLoginComponent,
		AccountProfileComponent,
		AccountRegisterComponent,
		AccountSettingsComponent,
		FooterComponent,
		LinkConnectionComponent,
		NotFoundComponent
	],
	imports: [
		CyphWebModule
	],
	providers: [
		{
			provide: DatabaseService,
			useClass: FirebaseDatabaseService
		}
	]
})
/* tslint:disable-next-line:no-stateless-class */
export class CyphAppModule {
	constructor () {}
}
