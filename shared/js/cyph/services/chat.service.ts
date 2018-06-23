/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import * as msgpack from 'msgpack-lite';
import {BehaviorSubject, combineLatest, interval, Observable, Subscription} from 'rxjs';
import {filter, map, take, takeWhile} from 'rxjs/operators';
import {ChatMessage, IChatData, IChatMessageInput, IChatMessageLiveValue, States} from '../chat';
import {HelpComponent} from '../components/help';
import {EncryptedAsyncMap} from '../crypto/encrypted-async-map';
import {IAsyncSet} from '../iasync-set';
import {IProto} from '../iproto';
import {LocalAsyncList} from '../local-async-list';
import {LocalAsyncMap} from '../local-async-map';
import {LocalAsyncSet} from '../local-async-set';
import {LocalAsyncValue} from '../local-async-value';
import {LockFunction} from '../lock-function-type';
import {MaybePromise} from '../maybe-promise-type';
import {
	BinaryProto,
	ChatMessage as ChatMessageProto,
	ChatMessageLiveValueSerialized,
	ChatMessageValue,
	ChatPendingMessage,
	IChatLastConfirmedMessage,
	IChatMessage,
	IChatMessageLine,
	IChatMessageLiveValueSerialized,
	IChatMessagePredecessor,
	IChatMessageValue,
	IChatPendingMessage,
	ISessionMessageDataList
} from '../proto';
import {events, ISessionMessageAdditionalData, ISessionMessageData, rpcEvents} from '../session';
import {Timer} from '../timer';
import {filterUndefined} from '../util/filter';
import {lockFunction} from '../util/lock';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {resolvable, sleep} from '../util/wait';
import {AnalyticsService} from './analytics.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {DialogService} from './dialog.service';
import {LocalStorageService} from './local-storage.service';
import {NotificationService} from './notification.service';
import {P2PWebRTCService} from './p2p-webrtc.service';
import {ScrollService} from './scroll.service';
import {SessionCapabilitiesService} from './session-capabilities.service';
import {SessionInitService} from './session-init.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';


/**
 * Manages a chat.
 */
@Injectable()
export class ChatService {
	/** @ignore */
	private static readonly approximateKeyExchangeTime: number	= 9000;

	/** @ignore */
	private static readonly p2pPassiveConnectTime: number		= 5000;


	/** @ignore */
	private readonly _CHAT_GEOMETRY_SERVICE				= resolvable<{
		getDimensions: (message: ChatMessage) => Promise<ChatMessage>;
	}>();

	/** @ignore */
	private lastConfirmedMessageID?: string;

	/** @ignore */
	private readonly messageChangeLock: LockFunction	= lockFunction();

	/** @ignore */
	private readonly messageConfirmLock: LockFunction	= lockFunction();

	/** @ignore */
	private readonly messageSendInnerLock: LockFunction	= lockFunction();

	/** @ignore */
	private readonly messageSendLock: LockFunction		= lockFunction();

	/** @ignore */
	private readonly messageValuesURL: string			= 'messageValues' + (
		this.sessionInitService.ephemeral ? 'Ephemeral' : ''
	);

	/** @ignore */
	private readonly resolveChatMessageGeometryService: (chatMessageGeometryService: {
		getDimensions: (message: ChatMessage) => Promise<ChatMessage>;
	/* tslint:disable-next-line:semicolon */
	}) => void	=
		this._CHAT_GEOMETRY_SERVICE.resolve
	;

	/** @ignore */
	private unconfirmedMessagesSubscription?: Subscription;

	/** @see ChatMessageGeometryService */
	protected readonly chatMessageGeometryService: Promise<{
		getDimensions: (message: ChatMessage) => Promise<ChatMessage>;
	}>	=
		this._CHAT_GEOMETRY_SERVICE.promise
	;

	/** Global map of message IDs to values. */
	protected readonly messageValues: EncryptedAsyncMap<IChatMessageValue>		=
		new EncryptedAsyncMap<IChatMessageValue>(
			this.potassiumService,
			this.messageValuesURL,
			ChatMessageValue,
			this.databaseService.getAsyncMap(this.messageValuesURL, BinaryProto)
		)
	;

	/** Local version of messageValues (ephemeral chat optimization). */
	protected readonly messageValuesLocal: EncryptedAsyncMap<IChatMessageValue>	=
		new EncryptedAsyncMap<IChatMessageValue>(
			this.potassiumService,
			this.messageValuesURL,
			ChatMessageValue
		)
	;

	/** Batch messages together that were sent within this interval. */
	protected readonly outgoingMessageBatchDelay: number						= 1776;

	/** Queue of messages to be sent. */
	protected readonly outgoingMessageQueue: {
		messageData: [
			Promise<IChatMessage>,
			Promise<IChatMessageLine[]>,
			string,
			Promise<IChatMessagePredecessor[]|undefined>,
			Promise<Uint8Array>,
			boolean|undefined,
			number|undefined,
			IChatMessageValue
		];
		resolve: () => void;
	}[]	= [];

	/** @see IChatData */
	public chat: IChatData;

	/** Indicates whether the chat is self-destructing. */
	public chatSelfDestruct: boolean		= false;

	/** Indicates whether the chat is self-destructed. */
	public chatSelfDestructed?: Observable<boolean>;

	/** Indicates whether the chat self-destruction effect should be running. */
	public chatSelfDestructEffect: boolean	= false;

	/** Time in seconds until chat self-destructs. */
	public chatSelfDestructTimeout: number	= 5;

	/** Timer for chat self-destruction. */
	public chatSelfDestructTimer?: Timer;

	/** Indicates whether the chat is ready to be displayed. */
	public initiated: boolean				= false;

	/** Sub-resolvables of uiReady. */
	public readonly resolvers				= {
		chatConnected: resolvable(),
		currentMessageSynced: resolvable(),
		messageListLoaded: resolvable()
	};

	/** Resolves when UI is ready to be displayed. */
	public readonly uiReady: Promise<true>	=
		Promise.all([
			this.resolvers.chatConnected.promise,
			this.resolvers.currentMessageSynced.promise,
			this.resolvers.messageListLoaded.promise
		]).then<true>(() =>
			true
		)
	;

	/** Indicates whether "walkie talkie" mode is enabled for calls. */
	public walkieTalkieMode: boolean		= false;

	/** @ignore */
	private async addTextMessage (...textMessageInputs: ISessionMessageData[]) : Promise<void> {
		const messageInputs	= filterUndefined(await Promise.all(textMessageInputs.map(async o => {
			if (!o.text) {
				return;
			}

			if (o.author !== this.sessionService.localUsername) {
				const unobservedPredecessors	=
					o.text.predecessors && o.text.predecessors.length > 0 ?
						(await Promise.all(o.text.predecessors.map(async predecessor => ({
							hasValidHash: await this.messageHasValidHash(
								predecessor.id,
								predecessor.hash
							),
							predecessor
						})))).
							filter(unobservedPredecessor => !unobservedPredecessor.hasValidHash).
							map(unobservedPredecessor => unobservedPredecessor.predecessor)
						:
						undefined
				;

				if (unobservedPredecessors && unobservedPredecessors.length > 0) {
					return this.chat.futureMessages.updateItem(
						unobservedPredecessors[0].id,
						async futureMessages => ({
							messages: futureMessages && futureMessages.messages ?
								futureMessages.messages.concat(o) :
								[o]
						})
					);
				}

				this.lastConfirmedMessageID	= o.id;

				this.messageConfirmLock(async () => {
					if (this.lastConfirmedMessageID === o.id) {
						await this.sessionService.send([
							rpcEvents.confirm,
							{textConfirmation: {id: o.id}}
						]);

						await sleep(this.outgoingMessageBatchDelay);
					}
				});
			}

			const selfDestructChat	= !!(
				o.text.selfDestructChat &&
				(
					o.text.selfDestructTimeout !== undefined &&
					!isNaN(o.text.selfDestructTimeout) &&
					o.text.selfDestructTimeout > 0
				) &&
				await (async () => {
					const messageIDs	= await this.chat.messageList.getFlatValue();

					return messageIDs.length === 0 || (
						messageIDs.length === 1 &&
						(
							await this.chat.messages.getItem(messageIDs[0])
						).authorType === ChatMessage.AuthorTypes.App
					);
				})()
			);

			if (selfDestructChat) {
				this.chatSelfDestruct	= true;
				await this.chat.messages.clear();
			}

			return {
				author: o.author,
				dimensions: o.text.dimensions,
				hash: o.text.hash,
				id: o.id,
				key: o.text.key,
				predecessors: o.text.predecessors,
				selfDestructChat,
				selfDestructTimeout: selfDestructChat ? undefined : o.text.selfDestructTimeout,
				timestamp: o.timestamp
			};
		})));

		if (messageInputs.length < 1) {
			return;
		}

		await this.addMessage(...messageInputs);

		await Promise.all(messageInputs.map(async o => {
			if (o.author !== this.sessionService.localUsername) {
				await this.chat.futureMessages.updateItem(o.id, async futureMessages => {
					if (futureMessages && futureMessages.messages) {
						await Promise.all(futureMessages.messages.map(async futureMessage =>
							this.addTextMessage(
								await this.sessionService.processMessageData(futureMessage)
							)
						));
					}

					return undefined;
				});
			}

			if (o.selfDestructChat) {
				this.chatSelfDestructed		= this.chat.messageList.watchFlat().pipe(
					map(messageIDs => messageIDs.length === 0)
				);
				this.chatSelfDestructTimer	= new Timer(this.chatSelfDestructTimeout * 1000);
				await this.chatSelfDestructTimer.start();
				this.chatSelfDestructEffect	= true;
				await sleep(500);
				await this.chat.messages.clear();
				await sleep(1000);
				this.chatSelfDestructEffect	= false;

				if (o.author !== this.sessionService.localUsername) {
					await sleep(10000);
					await this.close();
				}
			}
		}));
	}

	/** This kills the chat. */
	private async close () : Promise<void> {
		if (this.unconfirmedMessagesSubscription) {
			this.unconfirmedMessagesSubscription.unsubscribe();
			this.unconfirmedMessagesSubscription	= undefined;
		}

		if (!this.sessionInitService.ephemeral) {
			this.sessionService.close();
			return;
		}
		else if (this.chat.state === States.aborted) {
			return;
		}

		this.dialogService.dismissToast();
		this.chat.isFriendTyping.next(false);
		this.scrollService.scrollDown();

		if (!this.chat.isConnected) {
			await this.abortSetup();
		}
		else if (!this.chat.isDisconnected) {
			this.chat.isDisconnected	= true;
			if (!this.chatSelfDestruct) {
				this.addMessage({value: this.stringsService.disconnectNotification});
			}
			this.sessionService.close();
		}
	}

	/** @ignore */
	private async messageHasValidHash (
		message: IChatMessage|string|undefined,
		expectedHash?: Uint8Array
	) : Promise<boolean> {
		if (typeof message === 'string') {
			message	= await this.chat.messages.getItem(message).catch(() => undefined);
		}

		if (message && message.id && message.hash && message.hash.length > 0) {
			await this.getMessageValue(message);

			return message.value !== undefined && (
				expectedHash === undefined ||
				this.potassiumService.compareMemory(message.hash, expectedHash)
			);
		}

		return false;
	}

	/** @ignore */
	private messageValueHasher (message: IChatMessage) : {
		proto: IProto<IChatMessage>;
		transform: (value: IChatMessageValue) => IChatMessage;
	} {
		return {
			proto: ChatMessageProto,
			transform: (value: IChatMessageValue) : IChatMessage => ({
				...message,
				authorID: message.authorID || '',
				authorType: ChatMessage.AuthorTypes.App,
				hash: undefined,
				key: undefined,
				selfDestructTimeout: message.selfDestructTimeout || 0,
				sessionSubID: message.sessionSubID || '',
				value
			})
		};
	}

	/** @ignore */
	private async processOutgoingMessages () : Promise<void> {
		await this.messageSendLock(async () => {
			if (this.outgoingMessageQueue.length < 1) {
				return;
			}

			const outgoingMessages	= this.outgoingMessageQueue.splice(
				0,
				this.outgoingMessageQueue.length
			);

			const {confirmPromise, newMessages}	= await this.sessionService.send(
				...outgoingMessages.map(({messageData}) : [
					string,
					(timestamp: number) => Promise<ISessionMessageAdditionalData>
				] => [
					rpcEvents.text,
					async timestamp => {
						const [
							chatMessage,
							dimensions,
							id,
							predecessors,
							key,
							selfDestructChat,
							selfDestructTimeout,
							value
						]	=
							await Promise.all(messageData)
						;

						const hash	= await this.messageValues.getItemHash(
							id,
							key,
							this.messageValueHasher({
								...chatMessage,
								authorType: ChatMessage.AuthorTypes.App,
								predecessors,
								timestamp
							}),
							value
						);

						return {
							id,
							text: {
								dimensions,
								hash,
								key,
								predecessors,
								selfDestructChat,
								selfDestructTimeout
							}
						};
					}
				])
			);

			this.messageSendInnerLock(async () => confirmPromise.then(async () => {
				await this.addTextMessage(...newMessages.map(({data}) => data));

				for (const outgoingMessage of outgoingMessages) {
					outgoingMessage.resolve();
				}
			}));

			await sleep(this.outgoingMessageBatchDelay);
		});
	}

	/** Gets author ID for including in message list item. */
	protected async getAuthorID (_AUTHOR: Observable<string>) : Promise<string|undefined> {
		return undefined;
	}

	/** Gets default chat data. */
	protected getDefaultChatData () : IChatData {
		return {
			currentMessage: {},
			futureMessages: new LocalAsyncMap<string, ISessionMessageDataList>(),
			initProgress: new BehaviorSubject(0),
			isConnected: false,
			isDisconnected: false,
			isFriendTyping: new BehaviorSubject(false),
			isMessageChanged: false,
			lastConfirmedMessage: new LocalAsyncValue({id: '', index: 0}),
			messageList: new LocalAsyncList<string[]>(),
			messages: new LocalAsyncMap<string, IChatMessage>(),
			pendingMessages: new LocalAsyncList<IChatMessage&{pending: true}>(),
			receiveTextLock: lockFunction(),
			state: States.none,
			unconfirmedMessages: new BehaviorSubject<{[id: string]: boolean|undefined}|undefined>(
				undefined
			)
		};
	}

	/** Gets async set for scrollService.unreadMessages. */
	protected getScrollServiceUnreadMessages () : MaybePromise<IAsyncSet<string>> {
		return new LocalAsyncSet<string>();
	}

	/** Aborts the process of chat initialisation and authentication. */
	public async abortSetup () : Promise<void> {
		this.chat.state	= States.aborted;
		this.sessionService.trigger(events.abort);
		this.sessionService.close();
		await this.dialogService.dismissToast();
	}

	/** Adds a message to the chat. */
	public async addMessage (...messageInputs: IChatMessageInput[]) : Promise<void> {
		/* tslint:disable-next-line:cyclomatic-complexity */
		const newMessages	= filterUndefined(await Promise.all(messageInputs.map(async ({
			author,
			dimensions,
			hash,
			id,
			key,
			predecessors,
			selfDestructTimeout,
			shouldNotify,
			timestamp,
			value
		}) => {
			if (author === undefined) {
				author			= this.sessionService.appUsername;
			}
			if (id === undefined) {
				id				= uuid(true);
			}
			if (shouldNotify === undefined) {
				shouldNotify	= author !== this.sessionService.localUsername;
			}
			if (timestamp === undefined) {
				timestamp		= await getTimestamp();
			}

			const messageValues	=
				this.sessionInitService.ephemeral && author === this.sessionService.appUsername ?
					this.messageValuesLocal :
					this.messageValues
			;

			if (typeof value === 'string') {
				value	= {text: value};
			}

			if (
				(
					value !== undefined &&
					!(
						value.calendarInvite ||
						value.form ||
						(value.quill && value.quill.length > 0) ||
						value.text
					)
				) ||
				this.chat.state === States.aborted ||
				(author !== this.sessionService.appUsername && this.chat.isDisconnected)
			) {
				return;
			}

			while (author !== this.sessionService.appUsername && !this.chat.isConnected) {
				await sleep(500);
			}

			if (shouldNotify) {
				if (author !== this.sessionService.appUsername) {
					if (this.sessionInitService.ephemeral) {
						this.notificationService.notify(this.stringsService.newMessageNotification);
					}
				}
				else if (value && value.text) {
					this.notificationService.notify(value.text);
				}
			}

			const authorID	= await this.getAuthorID(author);

			const chatMessage: IChatMessage	= {
				authorID,
				authorType:
					author === this.sessionService.appUsername ?
						ChatMessage.AuthorTypes.App :
					author === this.sessionService.localUsername ?
						ChatMessage.AuthorTypes.Local :
						ChatMessage.AuthorTypes.Remote
				,
				dimensions,
				id,
				predecessors,
				selfDestructTimeout,
				sessionSubID: this.sessionService.sessionSubID,
				timestamp
			};

			if (value) {
				const o	= await messageValues.setItem(
					id,
					value,
					this.messageValueHasher(chatMessage)
				);

				hash	= o.hash;
				key		= o.encryptionKey;
			}

			chatMessage.hash	= hash;
			chatMessage.key		= key;

			if (author === this.sessionService.remoteUsername) {
				await this.scrollService.trackItem(id);
			}

			await this.chat.messages.setItem(id, chatMessage);

			return chatMessage;
		})));

		if (newMessages.length < 1) {
			return;
		}

		await this.chat.messageList.pushItem(newMessages.map(chatMessage => chatMessage.id));

		const pendingMessageRoot	= this.chat.pendingMessageRoot;

		await Promise.all([
			...(!pendingMessageRoot ? [] : messageInputs.map(async ({author, id}) => {
				if (author === this.sessionService.localUsername && pendingMessageRoot) {
					await this.localStorageService.removeItem(`${pendingMessageRoot}/${id}`);
				}
			})),
			...newMessages.map(async chatMessage => {
				if (
					chatMessage.hash &&
					chatMessage.key &&
					chatMessage.selfDestructTimeout !== undefined &&
					!isNaN(chatMessage.selfDestructTimeout) &&
					chatMessage.selfDestructTimeout > 0
				) {
					await sleep(chatMessage.selfDestructTimeout + 10000);

					this.potassiumService.clearMemory(chatMessage.hash);
					this.potassiumService.clearMemory(chatMessage.key);

					chatMessage.hash	= undefined;
					chatMessage.key		= undefined;

					await this.chat.messages.setItem(chatMessage.id, chatMessage);
				}
			})
		]);
	}

	/** Begins chat. */
	public async begin () : Promise<void> {
		if (this.chat.state === States.aborted) {
			return;
		}

		/* Workaround for Safari bug that breaks initiating a new chat */
		this.sessionService.send([rpcEvents.ping, {}]);

		if (this.chat.queuedMessage) {
			this.send(
				undefined,
				{text: this.chat.queuedMessage},
				this.chatSelfDestruct ?
					this.chatSelfDestructTimeout * 1000 :
					undefined
				,
				this.chatSelfDestruct
			);
		}

		if (this.sessionInitService.ephemeral) {
			this.notificationService.notify(this.stringsService.connectedNotification);

			this.initProgressFinish();
			this.chat.state	= States.chatBeginMessage;

			await sleep(3000);

			if (<States> this.chat.state === States.aborted) {
				return;
			}

			this.sessionService.trigger(events.beginChatComplete);

			this.chat.state	= States.chat;

			for (let i = 0 ; i < 15 ; ++i) {
				if (this.chatSelfDestruct) {
					break;
				}
				await sleep(100);
			}

			if (!this.chatSelfDestruct) {
				this.addMessage({
					shouldNotify: false,
					timestamp: (await getTimestamp()) - 30000,
					value: this.stringsService.introductoryMessage
				});
			}

			this.initiated	= true;
			this.resolvers.chatConnected.resolve();
		}

		this.chat.isConnected	= true;
	}

	/** After confirmation dialog, this kills the chat. */
	public async disconnectButton () : Promise<void> {
		if (await this.dialogService.confirm({
			cancel: this.stringsService.cancel,
			content: this.stringsService.disconnectConfirm,
			ok: this.stringsService.continueDialogAction,
			title: this.stringsService.disconnectTitle
		})) {
			await this.close();
		}
	}

	/** Gets message value if not already set. */
	public async getMessageValue (message: IChatMessage) : Promise<IChatMessage> {
		if (message.value !== undefined) {
			return message;
		}

		const referencesValue	=
			(message.hash && message.hash.length > 0) &&
			(message.key && message.key.length > 0)
		;

		for (const messageValues of [this.messageValuesLocal, this.messageValues]) {
			if (
				referencesValue &&
				message.value === undefined &&
				message.hash !== undefined &&
				message.key !== undefined
			) {
				message.value	= await messageValues.getItem(
					message.id,
					message.key,
					message.hash,
					this.messageValueHasher(message)
				).catch(
					() => undefined
				);
			}
		}

		if (message instanceof ChatMessage) {
			if (referencesValue && message.value === undefined) {
				message.value	= {
					failure: true,
					text: this.stringsService.getMessageValueFailure
				};
			}

			message.valueWatcher.next(message.value);
		}

		return message;
	}

	/** Displays help information. */
	public helpButton () : void {
		this.dialogService.baseDialog(HelpComponent);

		this.analyticsService.sendEvent({
			eventAction: 'show',
			eventCategory: 'help',
			eventValue: 1,
			hitType: 'event'
		});
	}

	/** Initializes service. */
	public init (chatMessageGeometryService: {
		getDimensions: (message: ChatMessage) => Promise<ChatMessage>;
	}) : void {
		this.resolveChatMessageGeometryService(chatMessageGeometryService);
	}

	/** Sets incrementing chat.initProgress to 100. */
	public initProgressFinish () : void {
		this.chat.initProgress.next(100);
	}

	/** Starts incrementing chat.initProgress up to 100. */
	public initProgressStart (
		totalTime: number = ChatService.approximateKeyExchangeTime,
		timeInterval: number = 250
	) : void {
		const increment	= timeInterval / totalTime;

		interval(timeInterval).pipe(
			takeWhile(() => this.chat.initProgress.value < 125),
			map(() => this.chat.initProgress.value + (increment * 100))
		).subscribe(
			this.chat.initProgress
		);
	}

	/**
	 * Handler for message change.
	 *
	 * In accounts, syncs current message to local storage.
	 *
	 * In ephemeral chat, checks for change to current message and
	 * sends appropriate typing indicator signals through session.
	 */
	public async messageChange (isText: boolean = false) : Promise<void> {
		return this.messageChangeLock(async () => {
			if (this.chat.pendingMessageRoot) {
				await this.localStorageService.setItem<IChatMessageLiveValueSerialized>(
					`${this.chat.pendingMessageRoot}-live`,
					ChatMessageLiveValueSerialized,
					{
						...this.chat.currentMessage,
						quill: this.chat.currentMessage.quill ?
							msgpack.encode({ops: this.chat.currentMessage.quill.ops}) :
							undefined
					}
				);
			}

			if (!this.sessionInitService.ephemeral || !isText) {
				return;
			}

			this.chat.previousMessage	= this.chat.currentMessage.text;

			await sleep(this.outgoingMessageBatchDelay);

			const isMessageChanged	=
				this.chat.currentMessage.text !== '' &&
				this.chat.currentMessage.text !== this.chat.previousMessage
			;

			if (this.chat.isMessageChanged !== isMessageChanged) {
				this.chat.isMessageChanged	= isMessageChanged;
				this.sessionService.send([
					rpcEvents.typing,
					{chatState: {isTyping: this.chat.isMessageChanged}}
				]);
			}
		});
	}

	/** Sends a message. */
	/* tslint:disable-next-line:cyclomatic-complexity */
	public async send (
		messageType: ChatMessageValue.Types = ChatMessageValue.Types.Text,
		message?: IChatMessageLiveValue,
		selfDestructTimeout?: number,
		selfDestructChat: boolean = false,
		keepCurrentMessage?: boolean,
		oldLocalStorageKey?: string
	) : Promise<string> {
		if (keepCurrentMessage === undefined) {
			keepCurrentMessage	= message !== undefined;
		}

		const id	= uuid(true);

		const value: IChatMessageValue				= {};
		const currentMessage: IChatMessageLiveValue	=
			keepCurrentMessage ? {} : this.chat.currentMessage
		;

		let emptyValue	= false;

		switch (messageType) {
			case ChatMessageValue.Types.CalendarInvite:
				value.calendarInvite			=
					(message && message.calendarInvite) ||
					this.chat.currentMessage.calendarInvite
				;
				currentMessage.calendarInvite	= undefined;

				if (!value.calendarInvite) {
					emptyValue	= true;
				}

				break;

			case ChatMessageValue.Types.FileTransfer:
				value.fileTransfer	=
					(message && message.fileTransfer) ||
					this.chat.currentMessage.fileTransfer
				;
				currentMessage.fileTransfer	= undefined;

				if (!value.fileTransfer) {
					emptyValue	= true;
				}

				break;

			case ChatMessageValue.Types.Form:
				value.form	= (message && message.form) || this.chat.currentMessage.form;
				currentMessage.form	= undefined;

				if (!value.form) {
					emptyValue	= true;
				}

				break;

			case ChatMessageValue.Types.Quill:
				value.quill	=
					message && message.quill ?
						msgpack.encode({ops: message.quill.ops}) :
						this.chat.currentMessage.quill ?
							msgpack.encode({ops: this.chat.currentMessage.quill.ops}) :
							undefined
				;
				currentMessage.quill	= undefined;

				if (!value.quill) {
					emptyValue	= true;
				}

				break;

			case ChatMessageValue.Types.Text:
				value.text	= (message && message.text) || this.chat.currentMessage.text;
				currentMessage.text	= '';
				this.messageChange();

				if (!value.text) {
					emptyValue	= true;
				}

				break;

			default:
				throw new Error('Invalid ChatMessageValue.Types value.');
		}

		const removeOldStorageItem	= () => oldLocalStorageKey ?
			this.localStorageService.removeItem(oldLocalStorageKey) :
			undefined
		;

		if (emptyValue) {
			await removeOldStorageItem();
			return id;
		}

		const localStoragePromise	= !this.chat.pendingMessageRoot ?
			Promise.resolve() :
			this.localStorageService.setItem<IChatPendingMessage>(
				`${this.chat.pendingMessageRoot}/${id}`,
				ChatPendingMessage,
				{
					message: value,
					messageType,
					selfDestructChat,
					selfDestructTimeout
				}
			).then(
				removeOldStorageItem
			)
		;

		const dimensionsPromise	= (async () =>
			(
				await (await this.chatMessageGeometryService).getDimensions(new ChatMessage(
					{
						authorID: '',
						authorType: ChatMessage.AuthorTypes.Local,
						id: '',
						timestamp: 0,
						value
					},
					this.sessionService.localUsername
				))
			).dimensions || []
		)();

		const predecessorsPromise	= (async () : Promise<IChatMessagePredecessor[]|undefined> => {
			let lastLocal: IChatMessagePredecessor|undefined;
			let lastRemote: IChatMessagePredecessor|undefined;

			const messageIDs	= await this.chat.messageList.getFlatValue();

			for (let i = messageIDs.length - 1 ; i >= 0 ; --i) {
				const o	= await this.chat.messages.getItem(messageIDs[i]);

				const isLocal	= !lastLocal && o.authorType === ChatMessage.AuthorTypes.Local;
				const isRemote	= !lastRemote && o.authorType === ChatMessage.AuthorTypes.Remote;

				if (
					(isLocal || isRemote) &&
					o.id &&
					(o.hash && o.hash.length > 0) &&
					(await this.messageHasValidHash(o))
				) {
					if (isLocal) {
						lastLocal	= {hash: o.hash, id: o.id};
					}
					else if (isRemote) {
						lastRemote	= {hash: o.hash, id: o.id};
					}
				}
			}

			return [...(lastLocal ? [lastLocal] : []), ...(lastRemote ? [lastRemote] : [])];
		})();

		const uploadPromise	= (async () =>
			(await this.messageValues.setItem(id, value)).encryptionKey
		)();

		const chatMessagePromise	= Promise.all([
			this.getAuthorID(this.sessionService.localUsername),
			dimensionsPromise,
			getTimestamp(),
			localStoragePromise
		]).then(async ([authorID, dimensions, timestamp]) : Promise<IChatMessage> => ({
			authorID,
			authorType: ChatMessage.AuthorTypes.Local,
			dimensions,
			id,
			selfDestructTimeout,
			sessionSubID: this.sessionService.sessionSubID,
			timestamp
		}));

		chatMessagePromise.then(async chatMessage => {
			await this.chat.pendingMessages.pushItem({
				...chatMessage,
				pending: true,
				value
			});

			await this.scrollService.scrollDown();
		});

		const resolver	= resolvable();

		this.outgoingMessageQueue.push({
			messageData: [
				chatMessagePromise,
				dimensionsPromise,
				id,
				predecessorsPromise,
				uploadPromise,
				selfDestructChat,
				selfDestructTimeout,
				value
			],
			resolve: resolver.resolve
		});

		this.processOutgoingMessages();

		await resolver.promise;
		return id;
	}

	/** Sets queued message to be sent after handshake. */
	public setQueuedMessage (messageText: string) : void {
		this.chat.queuedMessage	= messageText;
		this.dialogService.toast(this.stringsService.queuedMessageSaved, 2500);
	}

	constructor (
		/** @ignore */
		protected readonly analyticsService: AnalyticsService,

		/** @ignore */
		protected readonly databaseService: DatabaseService,

		/** @ignore */
		protected readonly dialogService: DialogService,

		/** @ignore */
		protected readonly localStorageService: LocalStorageService,

		/** @ignore */
		protected readonly notificationService: NotificationService,

		/** @ignore */
		protected readonly p2pWebRTCService: P2PWebRTCService,

		/** @ignore */
		protected readonly potassiumService: PotassiumService,

		/** @ignore */
		protected readonly scrollService: ScrollService,

		/** @ignore */
		protected readonly sessionService: SessionService,

		/** @ignore */
		protected readonly sessionCapabilitiesService: SessionCapabilitiesService,

		/** @ignore */
		protected readonly sessionInitService: SessionInitService,

		/** @ignore */
		protected readonly stringsService: StringsService
	) {
		this.chat	= this.getDefaultChatData();

		this.sessionService.ready.then(() => {
			const beginChat				= this.sessionService.one(events.beginChat);
			const callType				= this.sessionInitService.callType;
			const pendingMessageRoot	= this.chat.pendingMessageRoot;

			this.p2pWebRTCService.initialCallPending	= callType !== undefined;

			this.scrollService.resolveUnreadItems(this.getScrollServiceUnreadMessages());

			this.unconfirmedMessagesSubscription		= combineLatest(
				this.chat.lastConfirmedMessage.watch(),
				this.chat.messageList.watchFlat()
			).pipe(map(([lastConfirmedMessage, messageIDs]) => {
				const unconfirmedMessages: {[id: string]: boolean}	= {};

				for (let i = messageIDs.length - 1 ; i >= 0 ; --i) {
					const id	= messageIDs[i];

					if (id === lastConfirmedMessage.id) {
						break;
					}
					else {
						unconfirmedMessages[id]	= true;
					}
				}

				return unconfirmedMessages;
			})).subscribe(
				this.chat.unconfirmedMessages
			);

			if (pendingMessageRoot) {
				this.localStorageService.getItem(
					`${this.chat.pendingMessageRoot}-live`,
					ChatMessageLiveValueSerialized
				).then(messageLiveValue => {
					this.chat.currentMessage.calendarInvite	=
						this.chat.currentMessage.calendarInvite ||
						messageLiveValue.calendarInvite
					;

					this.chat.currentMessage.fileTransfer	=
						this.chat.currentMessage.fileTransfer ||
						messageLiveValue.fileTransfer
					;

					this.chat.currentMessage.form			=
						this.chat.currentMessage.form ||
						messageLiveValue.form
					;

					this.chat.currentMessage.quill			=
						this.chat.currentMessage.quill ||
						(
							messageLiveValue.quill &&
							messageLiveValue.quill.length > 0
						) ?
							{ops: msgpack.decode(messageLiveValue.quill)} :
							undefined
					;

					this.chat.currentMessage.text			=
						this.chat.currentMessage.text ||
						messageLiveValue.text
					;
				}).catch(
					() => {}
				).then(() => {
					this.resolvers.currentMessageSynced.resolve();
				});

				this.localStorageService.lock(pendingMessageRoot, async () => {
					const pendingMessages	= await this.localStorageService.getValues(
						pendingMessageRoot,
						ChatPendingMessage,
						true
					);

					await Promise.all(pendingMessages.map(async ([key, pendingMessage]) =>
						this.send(
							pendingMessage.messageType,
							{
								...pendingMessage.message,
								quill: (
									pendingMessage.message.quill &&
									pendingMessage.message.quill.length > 0
								) ?
									{ops: msgpack.decode(pendingMessage.message.quill)} :
									undefined
							},
							pendingMessage.selfDestructTimeout,
							pendingMessage.selfDestructChat,
							true,
							key
						)
					));
				});
			}
			else {
				this.resolvers.currentMessageSynced.resolve();
			}

			beginChat.then(() => { this.begin(); });

			this.sessionService.closed.then(async () =>
				this.close()
			);

			this.sessionService.connected.then(async () => {
				this.sessionCapabilitiesService.resolveWalkieTalkieMode(this.walkieTalkieMode);

				if (callType !== undefined) {
					this.sessionService.yt().then(async () => {
						await this.sessionService.freezePong.pipe(
							filter(b => !b),
							take(1)
						).toPromise();

						if (!this.sessionInitService.ephemeral) {
							this.initProgressStart(42000);
						}

						await this.dialogService.toast(
							callType === 'video' ?
								this.stringsService.p2pWarningVideoPassive :
								this.stringsService.p2pWarningAudioPassive
							,
							ChatService.p2pPassiveConnectTime,
							this.stringsService.cancel
						);
					}).then(async canceled => {
						if (!canceled) {
							this.p2pWebRTCService.accept(callType, true);
						}
						else if (this.sessionInitService.ephemeral) {
							await this.close();
							return;
						}

						this.p2pWebRTCService.resolveReady();

						if (this.sessionInitService.ephemeral) {
							await beginChat;
						}

						if (canceled) {
							await this.p2pWebRTCService.close();
						}
						else {
							await this.p2pWebRTCService.request(callType, true);
						}
					});
				}
				else {
					this.p2pWebRTCService.resolveReady();
				}

				if (!this.sessionInitService.ephemeral) {
					return;
				}

				this.chat.state	= States.keyExchange;
				this.initProgressStart();
			});

			this.sessionService.one(events.connectFailure).then(async () =>
				this.abortSetup()
			);

			this.sessionService.on(rpcEvents.confirm, async (newEvents: ISessionMessageData[]) => {
				for (const o of newEvents) {
					if (!o.textConfirmation || !o.textConfirmation.id) {
						continue;
					}

					const id			= o.textConfirmation.id;
					const messageIDs	= await this.chat.messageList.getFlatValue();

					let newLastConfirmedMessage: IChatLastConfirmedMessage|undefined;
					for (let i = messageIDs.length - 1 ; i >= 0 ; --i) {
						if (messageIDs[i] === id) {
							newLastConfirmedMessage	= {id, index: i};
							break;
						}
					}

					if (!newLastConfirmedMessage) {
						continue;
					}

					this.chat.lastConfirmedMessage.updateValue(async lastConfirmedMessage => {
						if (
							!newLastConfirmedMessage ||
							lastConfirmedMessage.id === newLastConfirmedMessage.id ||
							lastConfirmedMessage.index > newLastConfirmedMessage.index
						) {
							throw newLastConfirmedMessage;
						}

						return newLastConfirmedMessage;
					});
				}
			});

			this.sessionService.on(rpcEvents.typing, (newEvents: ISessionMessageData[]) => {
				for (const o of newEvents) {
					if (o.chatState) {
						this.chat.isFriendTyping.next(o.chatState.isTyping);
					}
				}
			});

			this.chat.receiveTextLock(async lockData => {
				const f	= async (newEvents: ISessionMessageData[]) =>
					this.addTextMessage(...newEvents)
				;

				this.sessionService.on(rpcEvents.text, f);
				await Promise.race([this.sessionService.closed, lockData.stillOwner.toPromise()]);
				this.sessionService.off(rpcEvents.text, f);
			});
		});

		this.sessionCapabilitiesService.capabilities.then(capabilities => {
			this.walkieTalkieMode	= capabilities.walkieTalkieMode;
		});
	}
}
