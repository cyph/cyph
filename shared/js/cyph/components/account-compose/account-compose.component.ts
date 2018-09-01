import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';
import {User} from '../../account';
import {BaseProvider} from '../../base-provider';
import {States} from '../../chat/enums';
import {AccountFileRecord, AccountUserTypes, ChatMessageValue, IForm} from '../../proto';
import {accountChatProviders} from '../../providers';
import {AccountChatService} from '../../services/account-chat.service';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {ScrollService} from '../../services/scroll.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {toBehaviorSubject} from '../../util/flatten-observable';
import {uuid} from '../../util/uuid';


/**
 * Angular component for account compose UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: accountChatProviders,
	selector: 'cyph-account-compose',
	styleUrls: ['./account-compose.component.scss'],
	templateUrl: './account-compose.component.html'
})
export class AccountComposeComponent extends BaseProvider implements OnDestroy, OnInit {
	/** @see AccountUserTypes */
	public readonly accountUserTypes: typeof AccountUserTypes	= AccountUserTypes;

	/** @see AccountChatMessageBoxComponent.calendarInviteFollowUp */
	public readonly appointmentFollowUp: BehaviorSubject<boolean>			=
		new BehaviorSubject(false)
	;

	/** Data for attaching a form to an appointment. */
	public readonly appointmentFormData: BehaviorSubject<{id: string; form: IForm}|undefined>	=
		new BehaviorSubject<{id: string; form: IForm}|undefined>(undefined)
	;

	/** @see ChatMessageValue.Types */
	public readonly chatMessageValueTypes: typeof ChatMessageValue.Types	=
		ChatMessageValue.Types
	;

	/** Indicates whether this component is using its own service providers. */
	protected readonly hasOwnProviders: boolean								= true;

	/** @see AccountChatMessageBoxComponent.messageType */
	public readonly messageType: BehaviorSubject<ChatMessageValue.Types>	= toBehaviorSubject(
		this.accountService.routeChanges.pipe(mergeMap(() => combineLatest(
			this.activatedRoute.firstChild ?
				this.activatedRoute.firstChild.data :
				this.activatedRoute.data
			,
			this.activatedRoute.params
		))).pipe(map(([o, params]) => {
			const messageType: ChatMessageValue.Types	= o.messageType;

			const value	= typeof o.value === 'function' ? o.value() : o.value;

			this.appointmentFollowUp.next(o.appointmentFollowUp === true);

			if (value !== undefined) {
				switch (messageType) {
					case ChatMessageValue.Types.CalendarInvite:
						this.accountChatService.chat.currentMessage.calendarInvite	= value;
						break;

					case ChatMessageValue.Types.FileTransfer:
						this.accountChatService.chat.currentMessage.fileTransfer	= value;
						break;

					case ChatMessageValue.Types.Form:
						this.accountChatService.chat.currentMessage.form			= value;

						this.appointmentFormData.next(
							typeof params.appointmentID === 'string' ?
								{id: params.appointmentID, form: value} :
								undefined
						);

						break;

					case ChatMessageValue.Types.Quill:
						this.accountChatService.chat.currentMessage.quill			= value;
						break;

					case ChatMessageValue.Types.Text:
						this.accountChatService.chat.currentMessage.text			= value;
						break;

					default:
						throw new Error('Invalid chat message type.');
				}

				this.accountChatService.updateChat();
			}

			return messageType;
		})),
		ChatMessageValue.Types.Quill
	);

	/** @see SearchBarComponent.filter */
	public readonly recipient: BehaviorSubject<Set<User>>				=
		new BehaviorSubject<Set<User>>(new Set())
	;

	/** @see SearchBarComponent.filterSingle */
	public readonly recipientSingle: BehaviorSubject<User|undefined>	=
		toBehaviorSubject(
			() => this.recipient.pipe(map(o => o.values().next().value)),
			undefined,
			this.subscriptions
		)
	;

	/** @see AccountContactsSearchComponent.searchUsername */
	public readonly searchUsername: BehaviorSubject<string>				= new BehaviorSubject('');

	/** Sends message. */
	public readonly send: () => Promise<void>							= async () => {
		this.sent.next(undefined);

		if (this.appointmentFormData.value !== undefined) {
			const {id, form}	= this.appointmentFormData.value;

			const appointment	=
				await this.accountFilesService.downloadFile(
					id,
					AccountFileRecord.RecordTypes.Appointment
				).result
			;

			if (appointment.forms === undefined) {
				appointment.forms	= [];
			}
			appointment.forms.push(form);

			await this.accountFilesService.updateAppointment(id, appointment);
		}
		else {
			const recipient	= this.recipientSingle.value;

			if (!recipient || !this.accountDatabaseService.currentUser.value) {
				this.sent.next(false);
				return;
			}

			if (
				this.messageType.value === ChatMessageValue.Types.CalendarInvite &&
				this.accountChatService.chat.currentMessage.calendarInvite !== undefined
			) {
				this.sentFileID.next(await this.accountFilesService.upload(
					(
						(
							this.envService.isTelehealth ?
								`${this.stringsService.telehealthCallAbout} ` :
								''
						) +
						(this.accountChatService.chat.currentMessage.calendarInvite.title || '?')
					),
					{
						calendarInvite: this.accountChatService.chat.currentMessage.calendarInvite,
						participants: [
							recipient.username,
							this.accountDatabaseService.currentUser.value.user.username
						],
						rsvpSessionSubID: uuid()
					},
					recipient.username
				).result);
			}
			else {
				await this.accountChatService.setUser(recipient.username, true);
				await this.accountChatService.resolvers.currentMessageSynced.promise;
				await this.accountChatService.send(
					this.messageType.value,
					undefined,
					undefined,
					undefined,
					true
				);
			}
		}

		this.accountChatService.chat.currentMessage.calendarInvite	= undefined;
		this.accountChatService.chat.currentMessage.form			= undefined;
		this.accountChatService.chat.currentMessage.quill			= undefined;
		this.accountChatService.chat.currentMessage.text			= '';

		this.accountChatService.updateChat();

		this.sent.next(true);
	/* tslint:disable-next-line:semicolon */
	};

	/** Indicates whether message has been sent, or undefined for in-progress. */
	public readonly sent: BehaviorSubject<boolean|undefined>		=
		new BehaviorSubject<boolean|undefined>(false)
	;

	/** ID of a file that has been sent, if applicable. */
	public readonly sentFileID: BehaviorSubject<string|undefined>	=
		new BehaviorSubject<string|undefined>(undefined)
	;

	/** @inheritDoc */
	public async ngOnDestroy () : Promise<void> {
		super.ngOnDestroy();

		if (this.hasOwnProviders) {
			await this.sessionService.destroy();
		}
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountChatService.chat.state	= States.chat;
		this.accountChatService.updateChat();
		this.sessionService.state.isAlive.next(true);

		this.subscriptions.push(this.activatedRoute.params.subscribe(async o => {
			const username: string|undefined	=
				await this.accountContactsService.getContactUsername(o.contactID).catch(() =>
					undefined
				)
			;

			if (!username) {
				return;
			}

			this.searchUsername.next(username);
		}));

		this.scrollService.init();
		this.accountService.transitionEnd();
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly accountChatService: AccountChatService,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
