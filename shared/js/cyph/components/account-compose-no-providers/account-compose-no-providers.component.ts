import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {AccountAppointmentsService} from '../../services/account-appointments.service';
import {AccountChatService} from '../../services/account-chat.service';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {ConfigService} from '../../services/config.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {ScrollService} from '../../services/scroll.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {AccountComposeComponent} from '../account-compose';

/**
 * Angular component for account compose UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-compose-no-providers',
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	styleUrls: ['../account-compose/account-compose.component.scss'],
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	templateUrl: '../account-compose/account-compose.component.html'
})
export class AccountComposeNoProvidersComponent extends AccountComposeComponent {
	/** @inheritDoc */
	protected readonly hasOwnProviders: boolean = false;

	constructor (
		accountAppointmentsService: AccountAppointmentsService,
		accountAuthService: AccountAuthService,
		accountContactsService: AccountContactsService,
		accountFilesService: AccountFilesService,
		configService: ConfigService,
		dialogService: DialogService,
		scrollService: ScrollService,
		sessionService: SessionService,
		activatedRoute: ActivatedRoute,
		accountService: AccountService,
		accountChatService: AccountChatService,
		accountDatabaseService: AccountDatabaseService,
		accountSettingsService: AccountSettingsService,
		envService: EnvService,
		stringsService: StringsService
	) {
		super(
			accountAppointmentsService,
			accountAuthService,
			accountContactsService,
			accountFilesService,
			configService,
			dialogService,
			scrollService,
			sessionService,
			activatedRoute,
			accountService,
			accountChatService,
			accountDatabaseService,
			accountSettingsService,
			envService,
			stringsService
		);
	}
}
