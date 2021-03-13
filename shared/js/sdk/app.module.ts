/* eslint-disable-next-line @typescript-eslint/triple-slash-reference */
/// <reference path="../typings/index.d.ts" />

/* eslint-disable-next-line @typescript-eslint/tslint/config */
import './polyfills';

/* eslint-disable-next-line @typescript-eslint/tslint/config */
import '../standalone/global';

/* eslint-disable-next-line @typescript-eslint/tslint/config */
import '../environments';

import {HttpClient} from '@angular/common/http';
import {NgModule, NgZone} from '@angular/core';
import {SERVER_TOKEN} from '@angular/flex-layout';
import {DomSanitizer} from '@angular/platform-browser';
import {ServerModule} from '@angular/platform-server';
import {DOMPurifyHtmlSanitizer} from '../cyph/dompurify-html-sanitizer';
import * as forms from '../cyph/forms';
import {IResolvable} from '../cyph/iresolvable';
import * as proto from '../cyph/proto';
import {AccountAppointmentsService} from '../cyph/services/account-appointments.service';
import {AccountContactsService} from '../cyph/services/account-contacts.service';
import {AccountDownloadService} from '../cyph/services/account-download.service';
import {AccountFilesService} from '../cyph/services/account-files.service';
import {AccountInviteService} from '../cyph/services/account-invite.service';
import {AccountNotificationsService} from '../cyph/services/account-notifications.service';
import {AccountPostsService} from '../cyph/services/account-posts.service';
import {AccountSettingsService} from '../cyph/services/account-settings.service';
import {AccountUserLookupService} from '../cyph/services/account-user-lookup.service';
import {AccountService} from '../cyph/services/account.service';
import {ConfigService} from '../cyph/services/config.service';
import {AccountAuthService} from '../cyph/services/crypto/account-auth.service';
import {AccountDatabaseService} from '../cyph/services/crypto/account-database.service';
import {MainThreadPotassiumService} from '../cyph/services/crypto/main-thread-potassium.service';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {CryptocurrencyService} from '../cyph/services/cryptocurrency.service';
import {DatabaseService} from '../cyph/services/database.service';
import {DialogService} from '../cyph/services/dialog.service';
import {EnvService} from '../cyph/services/env.service';
import {FileService} from '../cyph/services/file.service';
import {StringsService} from '../cyph/services/strings.service';
import {resolveStaticServices} from '../cyph/util/static-services';
import {resolvable} from '../cyph/util/wait';
import * as util from '../cyph/util';
import {
	bootstrap,
	declarations,
	imports,
	providers
} from '../cyph.app/app-module-options';

/**
 * Angular module for Cyph SDK.
 */
@NgModule({
	bootstrap,
	declarations,
	imports: [...imports, ServerModule],
	providers: [
		...providers,
		{provide: SERVER_TOKEN, useValue: true},
		{
			provide: PotassiumService,
			useClass: MainThreadPotassiumService
		}
	]
})
export class AppModule {
	/** SDK export. */
	public static readonly sdk: {ready: IResolvable<void>} & Record<
		string,
		any
	> = {ready: resolvable()};

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
		potassiumService: PotassiumService,
		stringsService: StringsService
	) {
		for (const [k, v] of Array.from(
			Object.entries({
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
				DOMPurifyHtmlSanitizer,
				envService,
				forms,
				potassiumService,
				proto,
				stringsService,
				util
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

		AppModule.sdk.ready.resolve();
	}
}
