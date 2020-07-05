/* eslint-disable max-lines */

import {
	ChangeDetectionStrategy,
	Component,
	OnDestroy,
	OnInit
} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {User} from '../../account';
import {slideInOutTop} from '../../animations';
import {BaseProvider} from '../../base-provider';
import {States} from '../../chat/enums';
import {emailPattern} from '../../email-pattern';
import {
	AccountFileRecord,
	AccountUserTypes,
	CallTypes,
	ChatMessageValue,
	IForm
} from '../../proto';
import {accountChatProviders} from '../../providers';
import {AccountChatService} from '../../services/account-chat.service';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountSettingsService} from '../../services/account-settings.service';
import {AccountService} from '../../services/account.service';
import {ConfigService} from '../../services/config.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {DatabaseService} from '../../services/database.service';
import {EnvService} from '../../services/env.service';
import {ScrollService} from '../../services/scroll.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {toBehaviorSubject} from '../../util/flatten-observable';
import {readableID, uuid} from '../../util/uuid';

/**
 * Angular component for account compose UI.
 */
@Component({
	animations: [slideInOutTop],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: accountChatProviders,
	selector: 'cyph-account-compose',
	styleUrls: ['./account-compose.component.scss'],
	templateUrl: './account-compose.component.html'
})
export class AccountComposeComponent extends BaseProvider
	implements OnDestroy, OnInit {
	/** Indicates whether this component is using its own service providers. */
	protected readonly hasOwnProviders: boolean = true;

	/** @see AccountUserTypes */
	public readonly accountUserTypes = AccountUserTypes;

	/** @see AccountChatMessageBoxComponent.calendarInviteFollowUp */
	public readonly appointmentFollowUp = new BehaviorSubject<boolean>(false);

	/** Data for attaching a form to an appointment. */
	public readonly appointmentFormData = new BehaviorSubject<
		{id: string; form: IForm} | undefined
	>(undefined);

	/** Indicates whether current user's time zone can be shared with recipient. */
	public readonly appointmentShareTimeZone = new BehaviorSubject<boolean>(
		true
	);

	/** Phone number for sending appointment detail over SMS. */
	public readonly appointmentSMS = new BehaviorSubject<string>('');

	/** @see ChatMessageValue.Types */
	public readonly chatMessageValueTypes = ChatMessageValue.Types;

	/** @see emailPattern */
	public readonly emailPattern = emailPattern;

	/** Indicates whether accountService.fromName and accountService.fromEmail were pre-set. */
	public readonly fromDataPreSet = new BehaviorSubject<boolean>(false);

	/** Message subject. */
	public readonly messageSubject = new BehaviorSubject('');

	/** @see AccountChatMessageBoxComponent.messageType */
	public readonly messageType = toBehaviorSubject(
		this.accountService.combinedRouteData(this.activatedRoute).pipe(
			map(([o, params]) => {
				const messageType: ChatMessageValue.Types = o.messageType;

				const value =
					typeof o.value === 'function' ?
						o.value({
							email: this.accountService.fromEmail.value,
							name: this.accountService.fromName.value
						}) :
						o.value;

				this.appointmentFollowUp.next(o.appointmentFollowUp === true);
				this.sendQuillAsNote.next(o.sendQuillAsNote === true);

				if (value !== undefined) {
					switch (messageType) {
						case ChatMessageValue.Types.CalendarInvite:
							this.accountChatService.chat.currentMessage.calendarInvite = value;
							break;

						case ChatMessageValue.Types.FileTransfer:
							this.accountChatService.chat.currentMessage.fileTransfer = value;
							break;

						case ChatMessageValue.Types.Form:
							this.accountChatService.chat.currentMessage.form = value;

							this.appointmentFormData.next(
								typeof params.appointmentID === 'string' ?
									{id: params.appointmentID, form: value} :
									undefined
							);

							break;

						case ChatMessageValue.Types.Quill:
							this.accountChatService.chat.currentMessage.quill = value;
							break;

						case ChatMessageValue.Types.Text:
							this.accountChatService.chat.currentMessage.text = value;
							break;

						default:
							throw new Error('Invalid chat message type.');
					}

					this.accountChatService.updateChat();
				}

				return messageType;
			})
		),
		ChatMessageValue.Types.Quill
	);

	/** @see SearchBarComponent.filter */
	public readonly recipients = new BehaviorSubject<Set<User>>(new Set());

	/** @see AccountContactsSearchComponent.searchUsername */
	public readonly searchUsername = new BehaviorSubject('');

	/** If true, will send Quill messages as Notes instead of chat messages. */
	public readonly sendQuillAsNote = new BehaviorSubject(false);

	/** Indicates whether message has been sent, or undefined for in-progress. */
	public readonly sent = new BehaviorSubject<boolean | undefined>(false);

	/** ID of a file that has been sent, if applicable. */
	public readonly sentFileID = new BehaviorSubject<string | undefined>(
		undefined
	);

	/** Metadata of a message that has been sent, if applicable. */
	public readonly sentMessage = new BehaviorSubject<
		{id: string; name?: string} | undefined
	>(undefined);

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** @inheritDoc */
	public async ngOnDestroy () : Promise<void> {
		super.ngOnDestroy();

		if (this.hasOwnProviders) {
			await this.sessionService.destroy();
		}
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountChatService.chat.state = States.chat;
		this.accountChatService.updateChat();
		this.sessionService.state.isAlive.next(true);

		if (
			this.accountService.fromEmail.value &&
			this.accountService.fromName.value
		) {
			this.fromDataPreSet.next(true);
		}

		this.subscriptions.push(
			this.activatedRoute.params.subscribe(async o => {
				const username: string | undefined =
					o.username ||
					(await this.accountContactsService
						.getContactUsername(o.contactID)
						.catch(() => undefined));

				if (!username) {
					return;
				}

				this.searchUsername.next(username);
			})
		);

		this.scrollService.init();
		this.accountService.transitionEnd();
		this.accountService.resolveUiReady();
	}

	/** Sends message. */
	/* eslint-disable-next-line complexity */
	public readonly send = async () => {
		const routeData = await this.activatedRoute.data
			.pipe(take(1))
			.toPromise();

		const fromName =
			this.accountService.fromName.value || this.stringsService.anonymous;

		if (
			this.envService.isTelehealthFull &&
			this.messageType.value === ChatMessageValue.Types.CalendarInvite &&
			typeof routeData.form === 'function' &&
			(this.accountDatabaseService.currentUser.value === undefined ||
				(await this.accountDatabaseService.currentUser.value.user.accountUserProfile.getValue())
					.userType === AccountUserTypes.Standard)
		) {
			this.accountChatService.chat.currentMessage.form = routeData.form({
				email: this.accountService.fromEmail.value,
				name: fromName
			});

			this.messageType.next(ChatMessageValue.Types.Form);
			return;
		}

		this.sent.next(undefined);

		if (this.appointmentFormData.value !== undefined) {
			const {id, form} = this.appointmentFormData.value;

			const appointment = await this.accountFilesService.downloadFile(
				id,
				AccountFileRecord.RecordTypes.Appointment
			).result;

			if (appointment.forms === undefined) {
				appointment.forms = [];
			}
			appointment.forms.push(form);

			await this.accountFilesService.updateAppointment(id, appointment);
		}
		else {
			const recipientUsers = Array.from(this.recipients.value);
			const recipients = recipientUsers.map(o => o.username);

			if (
				recipients.length < 1 &&
				!(
					this.accountDatabaseService.currentUser.value &&
					(this.accountService.fromEmail.value ||
						this.appointmentSMS.value)
				)
			) {
				this.sent.next(false);
				return;
			}

			if (
				this.messageType.value === ChatMessageValue.Types.Form &&
				routeData.messageType === ChatMessageValue.Types.CalendarInvite
			) {
				this.messageType.next(ChatMessageValue.Types.CalendarInvite);
			}

			if (
				this.messageType.value ===
					ChatMessageValue.Types.CalendarInvite &&
				this.accountChatService.chat.currentMessage.calendarInvite !==
					undefined
			) {
				const {
					calendarInvite
				} = this.accountChatService.chat.currentMessage;

				const callType =
					calendarInvite.callType === CallTypes.Audio ?
						'audio' :
					calendarInvite.callType === CallTypes.Video ?
						'video' :
						undefined;

				const id = readableID(this.configService.cyphIDLength);

				calendarInvite.url = `${
					this.envService.appUrl
				}account-burner/${callType || 'chat'}/${id}`;

				const [sentFileID] = await Promise.all([
					this.accountFilesService.upload(
						(this.envService.isTelehealth ?
							`${this.stringsService.telehealthCallAbout} ` :
							'') + (calendarInvite.title || '?'),
						{
							calendarInvite,
							forms: this.accountChatService.chat.currentMessage
								.form ?
								[
									this.accountChatService.chat.currentMessage
										.form
								] :
								undefined,
							fromEmail:
								this.accountService.fromEmail.value ||
								undefined,
							fromName,
							participants: [
								...recipients,
								...(this.accountDatabaseService.currentUser
									.value ?
									[
										this.accountDatabaseService.currentUser
											.value.user.username
									] :
									[])
							],
							rsvpSessionSubID: uuid()
						},
						recipients
					).result,
					this.accountSettingsService.staticFeatureFlags.scheduler
						.pipe(take(1))
						.toPromise()
						.then(async schedulerEnabled =>
							schedulerEnabled ?
								this.databaseService.callFunction(
									'appointmentInvite',
									{
										callType,
										eventDetails: {
											endTime: calendarInvite.endTime,
											startTime: calendarInvite.startTime
										},
										id,
										inviterTimeZone: this
											.appointmentShareTimeZone.value ?
											Intl.DateTimeFormat().resolvedOptions()
												.timeZone :
											undefined,
										telehealth: this.configService
											.planConfig[
											await this.accountSettingsService.plan
												.pipe(take(1))
												.toPromise()
										].telehealth,
										to: {
											email: this.accountService.fromEmail
												.value,
											name: this.accountService.fromName
												.value
										},
										toSMS: this.appointmentSMS.value
									}
								) :
								undefined
						)
				]);

				this.sentFileID.next(sentFileID);
			}
			else if (
				this.messageType.value === ChatMessageValue.Types.Quill &&
				this.sendQuillAsNote.value
			) {
				if (
					!this.messageSubject.value ||
					!this.accountChatService.chat.currentMessage.quill ||
					recipients.length < 1
				) {
					return;
				}

				await this.accountFilesService.upload(
					this.messageSubject.value,
					this.accountChatService.chat.currentMessage.quill,
					recipients,
					undefined,
					{
						email: this.accountService.fromEmail.value,
						name: fromName
					}
				).result;
			}
			else {
				if (
					!this.accountDatabaseService.currentUser.value &&
					!(await this.accountAuthService.register(
						{pseudoAccount: true},
						undefined,
						undefined,
						undefined,
						fromName,
						this.accountService.fromEmail.value
					))
				) {
					this.sent.next(false);
					return;
				}

				if (recipients.length === 1) {
					await this.accountContactsService.addContact(recipients[0]);
				}

				const chat =
					recipients.length === 1 ?
						{username: recipients[0]} :
						await this.accountFilesService.initMessagingGroup(
							recipients,
							this.messageType.value ===
								ChatMessageValue.Types.Quill
						);

				if ('username' in chat) {
					const [id, {name, realUsername}] = await Promise.all([
						recipientUsers[0].contactID,
						recipientUsers[0].accountUserProfile.getValue()
					]);

					this.sentMessage.next({
						id,
						name: `${name} (@${realUsername})`
					});
				}
				else {
					this.sentMessage.next({id: chat.id});
				}

				await this.accountChatService.setUser(
					chat,
					true,
					undefined,
					this.messageType.value === ChatMessageValue.Types.Quill ?
						'mail' :
						undefined
				);

				await this.accountChatService.resolvers.currentMessageSynced;

				await this.accountChatService.send(
					this.messageType.value,
					undefined,
					undefined,
					undefined,
					true
				);
			}
		}

		this.accountChatService.chat.currentMessage.calendarInvite = undefined;
		this.accountChatService.chat.currentMessage.form = undefined;
		this.accountChatService.chat.currentMessage.quill = undefined;
		this.accountChatService.chat.currentMessage.text = '';
		this.accountService.fromEmail.next('');
		this.accountService.fromName.next('');
		this.appointmentSMS.next('');
		this.messageSubject.next('');

		this.accountChatService.updateChat();

		this.sent.next(true);
	};

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly scrollService: ScrollService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @see ActivatedRoute */
		public readonly activatedRoute: ActivatedRoute,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountChatService */
		public readonly accountChatService: AccountChatService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountSettingsService */
		public readonly accountSettingsService: AccountSettingsService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
