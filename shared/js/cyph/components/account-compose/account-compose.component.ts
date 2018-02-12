import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {map} from 'rxjs/operators/map';
import {User} from '../../account';
import {States} from '../../chat/enums';
import {Appointment, ChatMessageValueTypes} from '../../proto';
import {accountChatProviders} from '../../providers';
import {AccountChatService} from '../../services/account-chat.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {ChatMessageGeometryService} from '../../services/chat-message-geometry.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {cacheObservable} from '../../util/flatten-observable';


/**
 * Angular component for account compose UI.
 */
@Component({
	providers: accountChatProviders,
	selector: 'cyph-account-compose',
	styleUrls: ['./account-compose.component.scss'],
	templateUrl: './account-compose.component.html'
})
export class AccountComposeComponent implements OnDestroy, OnInit {
	/** @see ChatMessageValueTypes */
	public readonly chatMessageValueTypes: typeof ChatMessageValueTypes	= ChatMessageValueTypes;

	/** @ignore */
	public readonly followUp: Observable<boolean>	=
	this.activatedRoute.data.pipe(map(o => o.followUp === true));

	/** @see AccountChatMessageBoxComponent.messageType */
	public readonly messageType: BehaviorSubject<ChatMessageValueTypes>	= cacheObservable(
		this.activatedRoute.data.pipe(map(o => {
			const messageType: ChatMessageValueTypes	= o.messageType;

			const value	= typeof o.value === 'function' ? o.value() : o.value;

			if (value !== undefined) {
				switch (messageType) {
					case ChatMessageValueTypes.CalendarInvite:
						this.accountChatService.chat.currentMessage.calendarInvite	= value;
						break;

					case ChatMessageValueTypes.Form:
						this.accountChatService.chat.currentMessage.form			= value;
						break;

					case ChatMessageValueTypes.Quill:
						this.accountChatService.chat.currentMessage.quill			= value;
						break;

					case ChatMessageValueTypes.Text:
						this.accountChatService.chat.currentMessage.text			= value;
						break;

					default:
						throw new Error('Invalid chat message type.');
				}
			}

			return messageType;
		})),
		ChatMessageValueTypes.Quill
	);

	/** @see SearchBarComponent.filter */
	public readonly recipient: BehaviorSubject<User|undefined>			=
		new BehaviorSubject<User|undefined>(undefined)
	;

	/** @see AccountContactsSearchComponent.searchUsername */
	public readonly searchUsername: BehaviorSubject<string>				= new BehaviorSubject('');

	/** Sends message. */
	public readonly send: () => Promise<void>							= async () => {
		if (!this.recipient.value || !this.accountDatabaseService.currentUser.value) {
			return;
		}

		this.sent.next(undefined);

		if (
			this.messageType.value === ChatMessageValueTypes.CalendarInvite &&
			this.accountChatService.chat.currentMessage.calendarInvite !== undefined
		) {
			await this.accountFilesService.upload(
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
						this.recipient.value.username,
						this.accountDatabaseService.currentUser.value.user.username
					],
					roles: !this.envService.isTelehealth ? {} : {
						[this.recipient.value.username]: Appointment.Roles.TelehealthDoctor,
						[
							this.accountDatabaseService.currentUser.value.user.username
						]: Appointment.Roles.TelehealthPatient
					}
				},
				this.recipient.value.username
			);
		}
		else {
			await this.accountChatService.setUser(this.recipient.value.username, true);
			await this.accountChatService.send(
				this.messageType.value,
				undefined,
				undefined,
				undefined,
				true
			);
		}

		this.accountChatService.chat.currentMessage.calendarInvite	= undefined;
		this.accountChatService.chat.currentMessage.form			= undefined;
		this.accountChatService.chat.currentMessage.quill			= undefined;
		this.accountChatService.chat.currentMessage.text			= '';

		this.sent.next(true);
	/* tslint:disable-next-line:semicolon */
	};

	/** Indicates whether message has been sent, or undefined for in-progress. */
	public sent: BehaviorSubject<boolean|undefined>						=
		new BehaviorSubject<boolean|undefined>(false)
	;

	/** @inheritDoc */
	public async ngOnDestroy () : Promise<void> {
		await this.sessionService.destroy();
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountChatService.chat.state	= States.chat;
		this.sessionService.state.isAlive	= true;

		this.activatedRoute.params.subscribe(async o => {
			const username: string|undefined	= o.username;

			if (!username) {
				return;
			}

			this.searchUsername.next(username);
		});

		this.accountChatService.init(this.chatMessageGeometryService);
		this.accountService.transitionEnd();
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly accountChatService: AccountChatService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly chatMessageGeometryService: ChatMessageGeometryService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
