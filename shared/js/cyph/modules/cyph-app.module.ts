import {NgModule} from '@angular/core';
import {AccountComponent} from '../components/account';
import {AccountAfterRegisterComponent} from '../components/account-after-register';
import {AccountAppointmentAgendaComponent} from '../components/account-appointment-agenda';
import {AccountBaseFileListComponent} from '../components/account-base-file-list';
import {AccountCallWaitingComponent} from '../components/account-call-waiting';
import {AccountChatComponent} from '../components/account-chat';
import {AccountChatMessageBoxComponent} from '../components/account-chat-message-box';
import {AccountComposeComponent} from '../components/account-compose';
import {AccountComposeNoProvidersComponent} from '../components/account-compose-no-providers';
import {AccountConfirmEmailComponent} from '../components/account-confirm-email';
import {AccountContactComponent} from '../components/account-contact';
import {AccountContactsComponent} from '../components/account-contacts';
import {AccountContactsSearchComponent} from '../components/account-contacts-search';
import {AccountDownloadComponent} from '../components/account-download';
import {AccountEhrAccessComponent} from '../components/account-ehr-access';
import {AccountFileSharingComponent} from '../components/account-file-sharing';
import {AccountFilesComponent} from '../components/account-files';
import {AccountFormComponent} from '../components/account-form';
import {AccountFormsComponent} from '../components/account-forms';
import {AccountHomeComponent} from '../components/account-home';
import {AccountIncomingPatientInfoComponent} from '../components/account-incoming-patient-info';
import {AccountLoginComponent} from '../components/account-login';
import {AccountMenuComponent} from '../components/account-menu';
import {AccountMessagingComponent} from '../components/account-messaging';
import {AccountNewDeviceActivationComponent} from '../components/account-new-device-activation';
import {AccountNoteComponent} from '../components/account-note';
import {AccountNotesComponent} from '../components/account-notes';
import {AccountNotificationCenterComponent} from '../components/account-notification-center';
import {AccountNotificationsSubscribeComponent} from '../components/account-notifications-subscribe';
import {AccountPasswordsComponent} from '../components/account-passwords';
import {AccountPGPComponent} from '../components/account-pgp';
import {AccountPostComponent} from '../components/account-post';
import {AccountPostComposeComponent} from '../components/account-post-compose';
import {AccountPostFeedComponent} from '../components/account-post-feed';
import {AccountPostFeedPageComponent} from '../components/account-post-feed-page';
import {AccountPostListComponent} from '../components/account-post-list';
import {AccountPostPageComponent} from '../components/account-post-page';
import {AccountProfileComponent} from '../components/account-profile';
import {AccountPseudoRelationshipResponseComponent} from '../components/account-pseudo-relationship-response';
import {AccountRegisterComponent} from '../components/account-register';
import {AccountSettingsComponent} from '../components/account-settings';
import {AccountSetupChecklistComponent} from '../components/account-setup-checklist';
import {AccountStorageAnalyticsComponent} from '../components/account-storage-analytics';
import {AccountUpgradeComponent} from '../components/account-upgrade';
import {AccountUserRatingComponent} from '../components/account-user-rating';
import {AccountVaultComponent} from '../components/account-vault';
import {AccountWalletsComponent} from '../components/account-wallets';
import {BurnerChatSetupComponent} from '../components/burner-chat-setup';
import {EmailComposeComponent} from '../components/email-compose';
import {FooterComponent} from '../components/footer';
import {InAppPurchaseComponent} from '../components/in-app-purchase';
import {LinkConnectionComponent} from '../components/link-connection';
import {LinkConnectionEmailComponent} from '../components/link-connection-email';
import {NotFoundComponent} from '../components/not-found';
import {PGPPublicKeyComponent} from '../components/pgp-public-key';
import {QRCodeScannerComponent} from '../components/qr-code-scanner';
import {UploadEhrCredentialsComponent} from '../components/upload-ehr-credentials';
import {WarrantCanaryComponent} from '../components/warrant-canary';
import {ProductTourDirective} from '../directives/product-tour.directive';
import {env} from '../env';
import {appModuleProviders} from '../providers/app-module';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountDownloadService} from '../services/account-download.service';
import {AccountFilesService} from '../services/account-files.service';
import {AccountPostsService} from '../services/account-posts.service';
import {AccountService} from '../services/account.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {PGPService} from '../services/crypto/pgp.service';
import {DatabaseService} from '../services/database.service';
import {ProductTourService} from '../services/product-tour.service';
import {CyphCommonModule} from './cyph-common.module';

/**
 * Common module with shared imports for application projects.
 */
@NgModule({
	declarations: [
		AccountAfterRegisterComponent,
		AccountAppointmentAgendaComponent,
		AccountBaseFileListComponent,
		AccountCallWaitingComponent,
		AccountChatComponent,
		AccountChatMessageBoxComponent,
		AccountComponent,
		AccountComposeComponent,
		AccountComposeNoProvidersComponent,
		AccountConfirmEmailComponent,
		AccountContactComponent,
		AccountContactsComponent,
		AccountContactsSearchComponent,
		AccountDownloadComponent,
		AccountEhrAccessComponent,
		AccountFilesComponent,
		AccountFileSharingComponent,
		AccountFormComponent,
		AccountFormsComponent,
		AccountHomeComponent,
		AccountIncomingPatientInfoComponent,
		AccountLoginComponent,
		AccountMenuComponent,
		AccountMessagingComponent,
		AccountNewDeviceActivationComponent,
		AccountNoteComponent,
		AccountNotesComponent,
		AccountNotificationCenterComponent,
		AccountNotificationsSubscribeComponent,
		AccountPasswordsComponent,
		AccountPGPComponent,
		AccountPostComponent,
		AccountPostComposeComponent,
		AccountPostFeedComponent,
		AccountPostFeedPageComponent,
		AccountPostListComponent,
		AccountPostPageComponent,
		AccountProfileComponent,
		AccountPseudoRelationshipResponseComponent,
		AccountRegisterComponent,
		AccountSettingsComponent,
		AccountSetupChecklistComponent,
		AccountStorageAnalyticsComponent,
		AccountUpgradeComponent,
		AccountUserRatingComponent,
		AccountVaultComponent,
		AccountWalletsComponent,
		BurnerChatSetupComponent,
		EmailComposeComponent,
		FooterComponent,
		InAppPurchaseComponent,
		LinkConnectionComponent,
		LinkConnectionEmailComponent,
		NotFoundComponent,
		PGPPublicKeyComponent,
		ProductTourDirective,
		QRCodeScannerComponent,
		UploadEhrCredentialsComponent,
		WarrantCanaryComponent
	],
	exports: [
		AccountAfterRegisterComponent,
		AccountAppointmentAgendaComponent,
		AccountBaseFileListComponent,
		AccountCallWaitingComponent,
		AccountChatComponent,
		AccountChatMessageBoxComponent,
		AccountComponent,
		AccountComposeComponent,
		AccountComposeNoProvidersComponent,
		AccountConfirmEmailComponent,
		AccountContactComponent,
		AccountContactsComponent,
		AccountContactsSearchComponent,
		AccountDownloadComponent,
		AccountEhrAccessComponent,
		AccountFilesComponent,
		AccountFileSharingComponent,
		AccountFormComponent,
		AccountFormsComponent,
		AccountHomeComponent,
		AccountIncomingPatientInfoComponent,
		AccountLoginComponent,
		AccountMenuComponent,
		AccountMessagingComponent,
		AccountNewDeviceActivationComponent,
		AccountNoteComponent,
		AccountNotesComponent,
		AccountNotificationCenterComponent,
		AccountNotificationsSubscribeComponent,
		AccountPasswordsComponent,
		AccountPGPComponent,
		AccountPostComponent,
		AccountPostComposeComponent,
		AccountPostFeedComponent,
		AccountPostFeedPageComponent,
		AccountPostListComponent,
		AccountPostPageComponent,
		AccountProfileComponent,
		AccountPseudoRelationshipResponseComponent,
		AccountRegisterComponent,
		AccountSettingsComponent,
		AccountSetupChecklistComponent,
		AccountStorageAnalyticsComponent,
		AccountUpgradeComponent,
		AccountUserRatingComponent,
		AccountVaultComponent,
		AccountWalletsComponent,
		BurnerChatSetupComponent,
		CyphCommonModule,
		EmailComposeComponent,
		FooterComponent,
		InAppPurchaseComponent,
		LinkConnectionComponent,
		LinkConnectionEmailComponent,
		NotFoundComponent,
		PGPPublicKeyComponent,
		ProductTourDirective,
		QRCodeScannerComponent,
		UploadEhrCredentialsComponent,
		WarrantCanaryComponent
	],
	imports: [CyphCommonModule],
	providers: appModuleProviders
})
export class CyphAppModule {
	constructor (
		accountService: AccountService,
		accountAuthService: AccountAuthService,
		accountContactsService: AccountContactsService,
		accountDatabaseService: AccountDatabaseService,
		accountDownloadService: AccountDownloadService,
		accountFilesService: AccountFilesService,
		accountPostsService: AccountPostsService,
		databaseService: DatabaseService,
		pgpService: PGPService,
		productTourService: ProductTourService
	) {
		AccountContactsService.accountContactsSearchComponent.resolve(
			AccountContactsSearchComponent
		);

		AccountFilesService.accountFileSharingComponent.resolve(
			AccountFileSharingComponent
		);

		/* For debugging */

		if (!env.debug) {
			return;
		}

		(<any> self).accountService = accountService;
		(<any> self).accountAuthService = accountAuthService;
		(<any> self).accountContactsService = accountContactsService;
		(<any> self).accountDatabaseService = accountDatabaseService;
		(<any> self).accountDownloadService = accountDownloadService;
		(<any> self).accountFilesService = accountFilesService;
		(<any> self).accountPostsService = accountPostsService;
		(<any> self).databaseService = databaseService;
		(<any> self).pgpService = pgpService;
		(<any> self).productTourService = productTourService;
	}
}
