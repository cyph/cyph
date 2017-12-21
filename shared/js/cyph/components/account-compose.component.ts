/* tslint:disable:member-ordering */

import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {map} from 'rxjs/operators/map';
import {User} from '../account';
import {States} from '../chat/enums';
import {ChatMessageValueTypes} from '../proto';
import {accountChatProviders} from '../providers';
import {AccountChatService} from '../services/account-chat.service';
import {ChatMessageGeometryService} from '../services/chat-message-geometry.service';
import {SessionService} from '../services/session.service';
import {StringsService} from '../services/strings.service';
import {observableToBehaviorSubject} from '../util/flatten-observable-promise';


/**
 * Angular component for account compose UI.
 */
@Component({
	providers: accountChatProviders,
	selector: 'cyph-account-compose',
	styleUrls: ['../../../css/components/account-compose.scss'],
	templateUrl: '../../../templates/account-compose.html'
})
export class AccountComposeComponent implements OnDestroy, OnInit {
	/** @see ChatMessageValueTypes */
	public readonly chatMessageValueTypes: typeof ChatMessageValueTypes	= ChatMessageValueTypes;

	/** @see AccountChatMessageBoxComponent.messageType */
	public readonly messageType: BehaviorSubject<ChatMessageValueTypes>	=
		observableToBehaviorSubject(
			this.activatedRoute.data.pipe(map((o: {
				messageType: ChatMessageValueTypes;
				value: any;
			}) => {
				const value	= typeof o.value === 'function' ? o.value() : o.value;

				if (value !== undefined) {
					switch (o.messageType) {
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

				return o.messageType;
			})),
			ChatMessageValueTypes.Quill
		)
	;

	/** @see AccountContactsSearchComponent.userFilter */
	public recipient: BehaviorSubject<User|undefined>	= new BehaviorSubject(undefined);

	/** @see AccountContactsSearchComponent.searchUsername */
	public searchUsername: BehaviorSubject<string>		= new BehaviorSubject('');

	/** Sends message. */
	public readonly send: () => Promise<void>			= async () => {
		if (!this.recipient.value) {
			return;
		}

		this.sent.next(undefined);

		await this.accountChatService.setUser(this.recipient.value.username, true);
		await this.accountChatService.send(
			this.messageType.value,
			undefined,
			undefined,
			undefined,
			true
		);

		this.accountChatService.chat.currentMessage.calendarInvite	= undefined;
		this.accountChatService.chat.currentMessage.form			= undefined;
		this.accountChatService.chat.currentMessage.quill			= undefined;
		this.accountChatService.chat.currentMessage.text			= '';

		this.sent.next(true);
	/* tslint:disable-next-line:semicolon */
	};

	/** Indicates whether message has been sent, or undefined for in-progress. */
	public sent: BehaviorSubject<boolean|undefined>		= new BehaviorSubject(false);

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.sessionService.state.isAlive	= false;
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
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly accountChatService: AccountChatService,

		/** @ignore */
		private readonly chatMessageGeometryService: ChatMessageGeometryService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
