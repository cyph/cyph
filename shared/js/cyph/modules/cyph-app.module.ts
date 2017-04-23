import {NgModule} from '@angular/core';
import {AccountChatComponent} from '../components/account-chat.component';
import {AccountContactsComponent} from '../components/account-contacts.component';
import {AccountFilesComponent} from '../components/account-files.component';
import {AccountHomeComponent} from '../components/account-home.component';
import {AccountLoginComponent} from '../components/account-login.component';
import {AccountLogoutComponent} from '../components/account-logout.component';
import {AccountMenuComponent} from '../components/account-menu.component';
import {AccountProfileComponent} from '../components/account-profile.component';
import {AccountRegisterComponent} from '../components/account-register.component';
import {AccountSettingsComponent} from '../components/account-settings.component';
import {AccountComponent} from '../components/account.component';
import {FooterComponent} from '../components/footer.component';
import {LinkConnectionComponent} from '../components/link-connection.component';
import {NotFoundComponent} from '../components/not-found.component';
import {CyphCommonModule} from './cyph-common.module';
import {CyphWebModule} from './cyph-web.module';


/**
 * Common module with shared imports for application projects.
 */
@NgModule({
	declarations: [
		AccountChatComponent,
		AccountComponent,
		AccountContactsComponent,
		AccountFilesComponent,
		AccountHomeComponent,
		AccountLoginComponent,
		AccountLogoutComponent,
		AccountMenuComponent,
		AccountProfileComponent,
		AccountRegisterComponent,
		AccountSettingsComponent,
		FooterComponent,
		LinkConnectionComponent,
		NotFoundComponent
	],
	exports: [
		AccountChatComponent,
		AccountComponent,
		AccountContactsComponent,
		AccountFilesComponent,
		AccountHomeComponent,
		AccountLoginComponent,
		AccountLogoutComponent,
		AccountMenuComponent,
		AccountProfileComponent,
		AccountRegisterComponent,
		AccountSettingsComponent,
		FooterComponent,
		LinkConnectionComponent,
		NotFoundComponent
	],
	imports: [
		CyphCommonModule,
		CyphWebModule
	]
})
/* tslint:disable-next-line:no-stateless-class */
export class CyphAppModule {
	constructor () {}
}
