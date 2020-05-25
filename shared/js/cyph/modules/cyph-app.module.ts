import {NgModule} from '@angular/core';
import {AccountComponent} from '../components/account';
import {AccountAfterRegisterComponent} from '../components/account-after-register';
import {AccountAppointmentsComponent} from '../components/account-appointments';
import {AccountAppointmentAgendaComponent} from '../components/account-appointment-agenda';
import {AccountBaseFileListComponent} from '../components/account-base-file-list';
import {AccountCallWaitingComponent} from '../components/account-call-waiting';
import {AccountChatComponent} from '../components/account-chat';
import {AccountChatMessageBoxComponent} from '../components/account-chat-message-box';
import {AccountComposeComponent} from '../components/account-compose';
import {AccountComposeNoProvidersComponent} from '../components/account-compose-no-providers';
import {AccountContactComponent} from '../components/account-contact';
import {AccountContactsComponent} from '../components/account-contacts';
import {AccountContactsSearchComponent} from '../components/account-contacts-search';
import {AccountEhrAccessComponent} from '../components/account-ehr-access';
import {AccountFileSharingComponent} from '../components/account-file-sharing';
import {AccountFilesComponent} from '../components/account-files';
import {AccountFormComponent} from '../components/account-form';
import {AccountFormsComponent} from '../components/account-forms';
import {AccountHomeComponent} from '../components/account-home';
import {AccountIncomingPatientInfoComponent} from '../components/account-incoming-patient-info';
import {AccountLoginComponent} from '../components/account-login';
import {AccountLogoutComponent} from '../components/account-logout';
import {AccountMenuComponent} from '../components/account-menu';
import {AccountNewDeviceActivationComponent} from '../components/account-new-device-activation';
import {AccountNoteComponent} from '../components/account-note';
import {AccountNotesComponent} from '../components/account-notes';
import {AccountNotificationCenterComponent} from '../components/account-notification-center';
import {AccountNotificationsSubscribeComponent} from '../components/account-notifications-subscribe';
import {AccountPasswordsComponent} from '../components/account-passwords';
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
import {AccountStorageAnalyticsComponent} from '../components/account-storage-analytics';
import {AccountUpgradeComponent} from '../components/account-upgrade';
import {AccountUserRatingComponent} from '../components/account-user-rating';
import {AccountWalletsComponent} from '../components/account-wallets';
import {FooterComponent} from '../components/footer';
import {LinkConnectionComponent} from '../components/link-connection';
import {LinkConnectionEmailComponent} from '../components/link-connection-email';
import {NotFoundComponent} from '../components/not-found';
import {PGPPublicKeyComponent} from '../components/pgp-public-key';
import {QRCodeScannerComponent} from '../components/qr-code-scanner';
import {UploadEhrCredentialsComponent} from '../components/upload-ehr-credentials';
import {env} from '../env';
import {AccountAppointmentsService} from '../services/account-appointments.service';
import {AccountAuthGuardService} from '../services/account-auth-guard.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountFilesService} from '../services/account-files.service';
import {AccountInviteService} from '../services/account-invite.service';
import {AccountNotificationsService} from '../services/account-notifications.service';
import {AccountOrganizationsService} from '../services/account-organizations.service';
import {AccountPostsService} from '../services/account-posts.service';
import {AccountSettingsService} from '../services/account-settings.service';
import {AccountUserLookupService} from '../services/account-user-lookup.service';
import {AccountService} from '../services/account.service';
import {AccountAuthService} from '../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../services/crypto/account-database.service';
import {PGPService} from '../services/crypto/pgp.service';
import {CryptocurrencyService} from '../services/cryptocurrency.service';
import {DatabaseService} from '../services/database.service';
import {EHRIntegrationService} from '../services/ehr-integration.service';
import {EHRService} from '../services/ehr.service';
import {FingerprintService} from '../services/fingerprint.service';
import {FirebaseDatabaseService} from '../services/firebase-database.service';
import {QRService} from '../services/qr.service';
import {WorkerService} from '../services/worker.service';
import {CyphCommonModule} from './cyph-common.module';
import {CyphWebModule} from './cyph-web.module';

/**
 * Common module with shared imports for application projects.
 */
@NgModule({
	declarations: [
		AccountAfterRegisterComponent,
		AccountAppointmentsComponent,
		AccountAppointmentAgendaComponent,
		AccountBaseFileListComponent,
		AccountCallWaitingComponent,
		AccountChatComponent,
		AccountChatMessageBoxComponent,
		AccountComponent,
		AccountComposeComponent,
		AccountComposeNoProvidersComponent,
		AccountContactComponent,
		AccountContactsComponent,
		AccountContactsSearchComponent,
		AccountEhrAccessComponent,
		AccountFilesComponent,
		AccountFileSharingComponent,
		AccountFormComponent,
		AccountFormsComponent,
		AccountHomeComponent,
		AccountIncomingPatientInfoComponent,
		AccountLoginComponent,
		AccountLogoutComponent,
		AccountMenuComponent,
		AccountNewDeviceActivationComponent,
		AccountNoteComponent,
		AccountNotesComponent,
		AccountNotificationCenterComponent,
		AccountNotificationsSubscribeComponent,
		AccountPasswordsComponent,
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
		AccountStorageAnalyticsComponent,
		AccountUpgradeComponent,
		AccountUserRatingComponent,
		AccountWalletsComponent,
		FooterComponent,
		LinkConnectionComponent,
		LinkConnectionEmailComponent,
		NotFoundComponent,
		PGPPublicKeyComponent,
		QRCodeScannerComponent,
		UploadEhrCredentialsComponent
	],
	exports: [
		AccountAfterRegisterComponent,
		AccountAppointmentsComponent,
		AccountAppointmentAgendaComponent,
		AccountBaseFileListComponent,
		AccountCallWaitingComponent,
		AccountChatComponent,
		AccountChatMessageBoxComponent,
		AccountComponent,
		AccountComposeComponent,
		AccountComposeNoProvidersComponent,
		AccountContactComponent,
		AccountContactsComponent,
		AccountContactsSearchComponent,
		AccountEhrAccessComponent,
		AccountFilesComponent,
		AccountFileSharingComponent,
		AccountFormComponent,
		AccountFormsComponent,
		AccountHomeComponent,
		AccountIncomingPatientInfoComponent,
		AccountLoginComponent,
		AccountLogoutComponent,
		AccountMenuComponent,
		AccountNewDeviceActivationComponent,
		AccountNoteComponent,
		AccountNotesComponent,
		AccountNotificationCenterComponent,
		AccountNotificationsSubscribeComponent,
		AccountPasswordsComponent,
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
		AccountStorageAnalyticsComponent,
		AccountUpgradeComponent,
		AccountUserRatingComponent,
		AccountWalletsComponent,
		FooterComponent,
		LinkConnectionComponent,
		LinkConnectionEmailComponent,
		NotFoundComponent,
		PGPPublicKeyComponent,
		QRCodeScannerComponent,
		UploadEhrCredentialsComponent
	],
	imports: [CyphCommonModule, CyphWebModule],
	providers: [
		AccountAppointmentsService,
		AccountAuthGuardService,
		AccountAuthService,
		AccountContactsService,
		AccountDatabaseService,
		AccountFilesService,
		AccountInviteService,
		AccountNotificationsService,
		AccountOrganizationsService,
		AccountPostsService,
		AccountService,
		AccountSettingsService,
		AccountUserLookupService,
		CryptocurrencyService,
		EHRIntegrationService,
		EHRService,
		FingerprintService,
		PGPService,
		QRService,
		WorkerService,
		{
			provide: DatabaseService,
			useClass: FirebaseDatabaseService
		}
	]
})
export class CyphAppModule {
	constructor (
		accountService: AccountService,
		accountAuthService: AccountAuthService,
		accountContactsService: AccountContactsService,
		accountDatabaseService: AccountDatabaseService,
		accountPostsService: AccountPostsService,
		databaseService: DatabaseService,
		pgpService: PGPService
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
		(<any> self).accountPostsService = accountPostsService;
		(<any> self).databaseService = databaseService;
		(<any> self).pgpService = pgpService;
	}
}
