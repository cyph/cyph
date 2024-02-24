/* eslint-disable @typescript-eslint/naming-convention */

/* eslint-disable-next-line @typescript-eslint/triple-slash-reference */
/// <reference path="../typings/index.d.ts" />

/* eslint-disable-next-line import/no-unassigned-import */
import './polyfills';

/* eslint-disable-next-line import/no-unassigned-import */
import '../environments';

import {HttpClient, HttpClientModule} from '@angular/common/http';
import {DoBootstrap, NgModule, NgZone} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {ServerModule} from '@angular/platform-server';
import {RouterModule} from '@angular/router';
import * as account from '../cyph/account';
import {DOMPurifyHtmlSanitizer} from '../cyph/dompurify-html-sanitizer';
import {emailRegex} from '../cyph/email-pattern';
import * as forms from '../cyph/forms';
import {IResolvable} from '../cyph/iresolvable';
import * as proto from '../cyph/proto';
import {AccountAppointmentsService} from '../cyph/services/account-appointments.service';
import {AccountAuthService} from '../cyph/services/crypto/account-auth.service';
import {AccountContactsService} from '../cyph/services/account-contacts.service';
import {AccountDatabaseService} from '../cyph/services/crypto/account-database.service';
import {AccountDownloadService} from '../cyph/services/account-download.service';
import {AccountFilesService} from '../cyph/services/account-files.service';
import {AccountInviteService} from '../cyph/services/account-invite.service';
import {AccountNotificationsService} from '../cyph/services/account-notifications.service';
import {AccountPostsService} from '../cyph/services/account-posts.service';
import {AccountService} from '../cyph/services/account.service';
import {AccountSettingsService} from '../cyph/services/account-settings.service';
import {AccountUserLookupService} from '../cyph/services/account-user-lookup.service';
import {AnalyticsService} from '../cyph/services/analytics.service';
import {ConfigService} from '../cyph/services/config.service';
import {MainThreadPotassiumService} from '../cyph/services/crypto/main-thread-potassium.service';
import {PGPService} from '../cyph/services/crypto/pgp.service';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {WebSignClientService} from '../cyph/services/crypto/websign-client.service';
import {CryptocurrencyService} from '../cyph/services/cryptocurrency.service';
import {DatabaseService} from '../cyph/services/database.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {ErrorService} from '../cyph/services/error.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {FileService} from '../cyph/services/file.service';
import {FingerprintService} from '../cyph/services/fingerprint.service';
import {FirebaseDatabaseService} from '../cyph/services/firebase-database.service';
import {InMemoryLocalStorageService} from '../cyph/services/in-memory-local-storage.service';
import {LocalStorageService} from '../cyph/services/local-storage.service';
import {NotificationService} from '../cyph/services/notification.service';
import {QRService} from '../cyph/services/qr.service';
import {SalesService} from '../cyph/services/sales.service';
import {StringsService} from '../cyph/services/strings.service';
import {WindowWatcherService} from '../cyph/services/window-watcher.service';
import {WebSignService} from '../cyph/services/websign.service';
import {WorkerService} from '../cyph/services/worker.service';
import {resolveStaticServices} from '../cyph/util/static-services';
import {resolvable} from '../cyph/util/wait/resolvable';
import * as util from '../cyph/util';

/**
 * Angular module for Cyph SDK.
 */
@NgModule({
	imports: [HttpClientModule, RouterModule.forRoot([]), ServerModule],
	providers: [
		/* From sharedModuleProviders */
		ConfigService,
		DialogService,
		EnvService,
		SalesService,
		StringsService,
		{
			provide: 'EnvService',
			useExisting: EnvService
		},

		/* From webModuleProviders */
		{
			provide: LocalStorageService,
			useClass: InMemoryLocalStorageService
		},

		/* From sharedModuleProviders */
		AnalyticsService,
		ErrorService,
		FaviconService,
		FileService,
		NotificationService,
		WindowWatcherService,

		/* From appModuleProviders */
		AccountAppointmentsService,
		AccountAuthService,
		AccountContactsService,
		AccountDatabaseService,
		AccountDownloadService,
		AccountFilesService,
		AccountInviteService,
		AccountNotificationsService,
		AccountPostsService,
		AccountService,
		AccountSettingsService,
		AccountUserLookupService,
		CryptocurrencyService,
		FingerprintService,
		PGPService,
		QRService,
		WebSignClientService,
		WebSignService,
		WorkerService,
		{
			provide: DatabaseService,
			useClass: FirebaseDatabaseService
		},

		/* SDK-specific */
		{
			provide: PotassiumService,
			useClass: MainThreadPotassiumService
		}
	]
})
export class AppModule implements DoBootstrap {
	/** SDK export. */
	public static readonly sdk: {ready: IResolvable<void>} & Record<
		string,
		any
	> = {ready: resolvable()};

	/** @inheritDoc */
	public ngDoBootstrap () : void {
		AppModule.sdk.ready.resolve();
	}

	constructor (
		domSanitizer: DomSanitizer,
		httpClient: HttpClient,
		ngZone: NgZone,
		accountService: AccountService,
		accountAppointmentsService: AccountAppointmentsService,
		accountAuthService: AccountAuthService,
		accountContactsService: AccountContactsService,
		accountDatabaseService: AccountDatabaseService,
		accountDownloadService: AccountDownloadService,
		accountFilesService: AccountFilesService,
		accountInviteService: AccountInviteService,
		accountNotificationsService: AccountNotificationsService,
		accountPostsService: AccountPostsService,
		accountSettingsService: AccountSettingsService,
		accountUserLookupService: AccountUserLookupService,
		configService: ConfigService,
		cryptocurrencyService: CryptocurrencyService,
		databaseService: DatabaseService,
		dialogService: DialogService,
		envService: EnvService,
		fileService: FileService,
		localStorageService: LocalStorageService,
		pgpService: PGPService,
		potassiumService: PotassiumService,
		stringsService: StringsService,
		webSignClientService: WebSignClientService,
		webSignService: WebSignService
	) {
		for (const [k, v] of Array.from(
			Object.entries({
				DOMPurifyHtmlSanitizer,
				account,
				accountAppointmentsService,
				accountAuthService,
				accountContactsService,
				accountDatabaseService,
				accountDownloadService,
				accountFilesService,
				accountInviteService,
				accountNotificationsService,
				accountPostsService,
				accountService,
				accountSettingsService,
				accountUserLookupService,
				configService,
				cryptocurrencyService,
				databaseService,
				emailRegex,
				envService,
				forms,
				localStorageService,
				pgpService,
				potassiumService,
				proto,
				stringsService,
				util,
				webSignClientService,
				webSignService
			})
		)) {
			AppModule.sdk[k] = v;
		}

		resolveStaticServices({
			dialogService,
			domSanitizer,
			fileService,
			httpClient,
			ngZone,
			stringsService
		});
	}
}
