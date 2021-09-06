import {AccountAppointmentsService} from '../services/account-appointments.service';
import {AccountAuthGuardService} from '../services/account-auth-guard.service';
import {AccountContactsService} from '../services/account-contacts.service';
import {AccountDownloadService} from '../services/account-download.service';
import {AccountEmailService} from '../services/account-email.service';
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
import {ProductTourService} from '../services/product-tour.service';
import {QRService} from '../services/qr.service';
import {WorkerService} from '../services/worker.service';

/** Providers for CyphAppModule. */
export const appModuleProviders = [
	AccountAppointmentsService,
	AccountAuthGuardService,
	AccountAuthService,
	AccountContactsService,
	AccountDatabaseService,
	AccountDownloadService,
	AccountEmailService,
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
	ProductTourService,
	QRService,
	WorkerService,
	{
		provide: DatabaseService,
		useClass: FirebaseDatabaseService
	}
];
