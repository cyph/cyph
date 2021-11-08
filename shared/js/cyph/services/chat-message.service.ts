/* eslint-disable max-lines */

import {Inject, Injectable, Optional} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {User, UserLike} from '../account';
import {BaseProvider} from '../base-provider';
import {ChatMessage, IChatData} from '../chat';
import {ListHoleError} from '../list-hole-error';
import {MaybePromise} from '../maybe-promise-type';
import {IChatMessage} from '../proto';
import {toInt} from '../util/formatting';
import {getOrSetDefault} from '../util/get-or-set-default';
import {observableAll} from '../util/observable-all';
import {compareDates, relativeDateString, watchDateChange} from '../util/time';
import {uuid} from '../util/uuid';
import {AccountSessionService} from './account-session.service';
import {AccountUserLookupService} from './account-user-lookup.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {EnvService} from './env.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';

const groupSessionIndexPrefix = ' GROUP SESSION INDEX: ';

const messageTimestamps = new Map<
	string,
	BehaviorSubject<number | undefined>
>();

const getMessageTimestampSubject = (message: IChatMessage | string) =>
	getOrSetDefault(
		messageTimestamps,
		typeof message === 'string' ? message : message.id,
		() => new BehaviorSubject<number | undefined>(undefined)
	);

const getDateChangeInternal = (
	message: IChatMessage | string | ListHoleError | undefined,
	last: IChatMessage | string | ListHoleError | undefined
) =>
	message === undefined || message instanceof ListHoleError ?
		of(undefined) :
	last === undefined || last instanceof ListHoleError ?
		observableAll([
			getMessageTimestampSubject(message),
			watchDateChange(true)
		]).pipe(
			switchMap(async ([messageTimestamp]) =>
				messageTimestamp !== undefined ?
					relativeDateString(messageTimestamp, true) :
					undefined
			)
		) :
		observableAll([
			getMessageTimestampSubject(message),
			getMessageTimestampSubject(last),
			watchDateChange(true)
		]).pipe(
			switchMap(async ([messageTimestamp, lastMessageTimestamp]) =>
				messageTimestamp !== undefined &&
				lastMessageTimestamp !== undefined &&
				!compareDates(lastMessageTimestamp, messageTimestamp, true) ?
					relativeDateString(messageTimestamp) :
					undefined
			)
		);

const getDateChangeInternalWrapper = memoize(
	(message: IChatMessage | string | ListHoleError | undefined) =>
		memoize(
			(last: IChatMessage | string | ListHoleError | undefined) =>
				getDateChangeInternal(message, last),
			(last: IChatMessage | string | ListHoleError | undefined) =>
				typeof last === 'string' ?
					last :
				last !== undefined && !(last instanceof ListHoleError) ?
					last.id :
					''
		),
	(message: IChatMessage | string | ListHoleError | undefined) =>
		typeof message === 'string' ?
			message :
		message !== undefined && !(message instanceof ListHoleError) ?
			message.id :
			''
);

const getMetadataInternal = async (
	id:
		| string
		| IChatMessage
		| (IChatMessage & {pending: true})
		| ListHoleError,
	chat: IChatData,
	sessionService: SessionService,
	accountDatabaseService: AccountDatabaseService | undefined,
	accountSessionService: AccountSessionService | undefined,
	accountUserLookupService: AccountUserLookupService | undefined,
	envService: EnvService,
	stringsService: StringsService
) => {
	const emptyMessage = {
		authorType: ChatMessage.AuthorTypes.App,
		hash: new Uint8Array(1),
		id: '',
		key: new Uint8Array(1),
		predecessors: [],
		timestamp: NaN
	};

	if (id instanceof ListHoleError) {
		const listHoleMessage = new ChatMessage(
			{
				...emptyMessage,
				id: `list-hole-${uuid(true)}`
			},
			sessionService.appUsername
		);

		listHoleMessage.value = {
			failure: true,
			text: stringsService.getMessageIDFailure
		};

		listHoleMessage.valueWatcher.next(listHoleMessage.value);

		return {message: listHoleMessage, pending: false};
	}

	const pending =
		typeof id !== 'string' && 'pending' in id ? id.pending : false;

	const message =
		typeof id !== 'string' ?
			id :
			await chat.messages.getItem(id).catch(() => undefined);

	if (
		message === undefined ||
		(message.sessionSubID || undefined) !== sessionService.sessionSubID
	) {
		return {
			message: new ChatMessage(
				emptyMessage,
				sessionService.appUsername,
				undefined,
				true
			),
			pending: false
		};
	}

	let author: Observable<string>;
	let authorUser: MaybePromise<UserLike | undefined>;

	if (message.authorType === ChatMessage.AuthorTypes.App) {
		author = sessionService.appUsername;
	}
	else if (message.authorType === ChatMessage.AuthorTypes.Local) {
		author = sessionService.localUsername;

		const currentUser =
			envService.isAccounts && accountDatabaseService ?
				accountDatabaseService.currentUser.value :
				undefined;

		authorUser = currentUser?.user;
	}
	else if (message.authorID === undefined) {
		author = sessionService.remoteUserString;
	}
	else {
		const authorSubject = new BehaviorSubject<string>(message.authorID);

		author = authorSubject;

		authorUser = (async () => {
			let user: UserLike | undefined;

			const hasGroupIndex = !!message.authorID?.startsWith(
				groupSessionIndexPrefix
			);

			try {
				if (!hasGroupIndex) {
					const remoteUser = await accountSessionService?.remoteUser;

					user =
						envService.isAccounts && accountUserLookupService ?
							remoteUser?.username === message.authorID ?
								remoteUser :
								await accountUserLookupService.getUser(
									message.authorID
								) :
							undefined;
				}
			}
			catch {}

			const groupIndex = hasGroupIndex ?
				toInt(
					(message.authorID || '').slice(
						groupSessionIndexPrefix.length
					)
				) :
				NaN;

			(user?.pseudoAccount ?
				user.name :
			user instanceof User ?
				user.realUsername :
			!isNaN(groupIndex) &&
				sessionService.group.value &&
				sessionService.group.value[groupIndex] ?
				sessionService.group.value[groupIndex].remoteUserString :
				sessionService.remoteUserString
			)
				/* eslint-disable-next-line rxjs/no-ignored-subscription */
				.subscribe(authorSubject);

			return user;
		})();
	}

	getMessageTimestampSubject(message).next(message.timestamp);

	return {
		message: new ChatMessage(message, author, authorUser),
		pending
	};
};

const getMetadataInternalWrapper = memoize(
	(
		id:
			| string
			| IChatMessage
			| (IChatMessage & {pending: true})
			| ListHoleError
	) =>
		memoize(
			(chat: IChatData) =>
				memoize(
					async (
						sessionService: SessionService,
						accountDatabaseService:
							| AccountDatabaseService
							| undefined,
						accountSessionService:
							| AccountSessionService
							| undefined,
						accountUserLookupService:
							| AccountUserLookupService
							| undefined,
						envService: EnvService,
						stringsService: StringsService
					) =>
						getMetadataInternal(
							id,
							chat,
							sessionService,
							accountDatabaseService,
							accountSessionService,
							accountUserLookupService,
							envService,
							stringsService
						),
					(sessionService: SessionService) =>
						sessionService.sessionSubID
				),
			(chat: IChatData) => chat.pendingMessageRoot || ''
		),
	(
		id:
			| string
			| IChatMessage
			| (IChatMessage & {pending: true})
			| ListHoleError
	) =>
		id instanceof ListHoleError ? id : typeof id === 'string' ? id : id.id
);

/**
 * Manages chat message metadata objects.
 */
@Injectable()
export class ChatMessageService extends BaseProvider {
	/** Author ID prefix used for identifying an index into sessionService.groups. */
	public static readonly groupSessionIndexPrefix = groupSessionIndexPrefix;

	/** Gets date change observable value. */
	public getDateChange (
		message: IChatMessage | string | ListHoleError | undefined,
		last: IChatMessage | string | ListHoleError | undefined
	) : Observable<string | undefined> {
		return getDateChangeInternalWrapper(message)(last);
	}

	/** Gets message metadata based on ID. */
	public async getMetadata (
		id:
			| string
			| IChatMessage
			| (IChatMessage & {pending: true})
			| ListHoleError,
		chat: IChatData
	) : Promise<{message: ChatMessage; pending: boolean}> {
		const {message, pending: wasPending} = await getMetadataInternalWrapper(
			id
		)(chat)(
			this.sessionService,
			this.accountDatabaseService,
			this.accountSessionService,
			this.accountUserLookupService,
			this.envService,
			this.stringsService
		);

		const pending =
			typeof id !== 'string' && 'pending' in id ? id.pending : false;

		if (!message.hidden && wasPending && !pending) {
			(async () => {
				const {timestamp} = await chat.messages
					.getItem(message.id)
					.catch(() => message);

				message.updateTimestamp(timestamp);
				getMessageTimestampSubject(message).next(timestamp);
			})();
		}

		return {message, pending};
	}

	constructor (
		/** @ignore */
		@Inject(AccountDatabaseService)
		@Optional()
		private readonly accountDatabaseService:
			| AccountDatabaseService
			| undefined,

		/** @ignore */
		@Inject(AccountSessionService)
		@Optional()
		private readonly accountSessionService:
			| AccountSessionService
			| undefined,

		/** @ignore */
		@Inject(AccountUserLookupService)
		@Optional()
		private readonly accountUserLookupService:
			| AccountUserLookupService
			| undefined,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();
	}
}
