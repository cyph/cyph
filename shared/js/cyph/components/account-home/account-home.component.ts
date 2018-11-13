import {AfterViewInit, ChangeDetectionStrategy, Component} from '@angular/core';
import {Router} from '@angular/router';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {
	emailInput,
	getFormValue,
	input,
	newForm,
	newFormComponent,
	newFormContainer,
	text
} from '../../forms';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DatabaseService} from '../../services/database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for account home UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-home',
	styleUrls: ['./account-home.component.scss'],
	templateUrl: './account-home.component.html'
})
export class AccountHomeComponent extends BaseProvider implements AfterViewInit {
	/** Indicates whether speed dial is open. */
	public readonly isSpeedDialOpen	= new BehaviorSubject<boolean>(false);

	/** @see AccountContactsComponent.searchMode */
	public readonly searchMode: Observable<boolean>	=
		this.accountService.routeChanges.pipe(map(url =>
			url.split('/').slice(-1)[0] === 'search'
		))
	;

	/** Adds an external contact via pseudo-relationship. */
	public async addExternalContact () : Promise<void> {
		const contactForm	= await this.dialogService.prompt({
			content: '',
			form: newForm([
				newFormComponent([newFormContainer([
					text({
						value: this.stringsService.addExternalContactContent
					})
				])]),
				newFormComponent([newFormContainer([
					emailInput({
						label: this.stringsService.email,
						required: true
					})
				])]),
				newFormComponent([newFormContainer([
					input({
						label: this.stringsService.nameOptional
					})
				])])
			]),
			title: this.stringsService.addExternalContactTitle
		});

		const email	= getFormValue(contactForm, 'string', 1, 0, 0);
		const name	= getFormValue(contactForm, 'string', 2, 0, 0);

		if (!email) {
			return;
		}

		await this.databaseService.callFunction(
			'requestPseudoRelationship',
			{email, name}
		);
	}

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		this.accountService.transitionEnd();
	}

	constructor (
		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see Router */
		public readonly router: Router,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
