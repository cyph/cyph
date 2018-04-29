/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import * as msgpack from 'msgpack-lite';
import {BehaviorSubject, combineLatest, interval, Observable, Subscription} from 'rxjs';
import {filter, map, take, takeWhile} from 'rxjs/operators';
import {ChatMessage, IChatData, IChatMessageLiveValue, States} from '../chat';
import {HelpComponent} from '../components/help';
import {LocalAsyncList} from '../local-async-list';
import {LocalAsyncMap} from '../local-async-map';
import {LocalAsyncValue} from '../local-async-value';
import {LockFunction} from '../lock-function-type';
import {
	ChatMessageValue,
	IChatLastConfirmedMessage,
	IChatMessage,
	IChatMessageLine,
	IChatMessageValue
} from '../proto';
import {events, ISessionMessageData, rpcEvents} from '../session';
import {Timer} from '../timer';
import {lockFunction} from '../util/lock';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {resolvable, sleep} from '../util/wait';
import {AnalyticsService} from './analytics.service';
import {DialogService} from './dialog.service';
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
	private static readonly approximateKeyExchangeTime: number	= 18000;

	/** @ignore */
	private static readonly p2pPassiveConnectTime: number		= 5000;


	/** @ignore */
	private readonly _CHAT_GEOMETRY_SERVICE				= resolvable<{
		getDimensions: (message: ChatMessage) => Promise<ChatMessage>;
	}>();

	/** @ignore */
	private readonly messageChangeLock: LockFunction	= lockFunction();

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

	/** Indicates whether "walkie talkie" mode is enabled for calls. */
	public walkieTalkieMode: boolean		= false;

	/** @ignore */
	private async addTextMessage (o: ISessionMessageData) : Promise<void> {
		if (!o.text) {
			return;
		}

		if (o.author !== this.sessionService.localUsername) {
			this.sessionService.send([rpcEvents.confirm, {textConfirmation: {id: o.id}}]);
		}

		const selfDestructChat	=
			o.text.selfDestructChat &&
			(
				o.text.selfDestructTimeout !== undefined &&
				!isNaN(o.text.selfDestructTimeout) &&
				o.text.selfDestructTimeout > 0
			) &&
			await (async () => {
				const messages	= await this.chat.messages.getValue();
				return messages.length === 0 || (
					messages.length === 1 &&
					messages[0].authorType === ChatMessage.AuthorTypes.App
				);
			})()
		;

		if (selfDestructChat) {
			this.chatSelfDestruct	= true;
			await this.chat.messages.clear();
		}

		await this.addMessage(
			o.text.value,
			o.author,
			o.timestamp,
			undefined,
			selfDestructChat ? undefined : o.text.selfDestructTimeout,
			o.text.dimensions,
			o.id
		);

		if (selfDestructChat) {
			this.chatSelfDestructed		=
				this.chat.messages.watch().pipe(map(messages => messages.length === 0))
			;
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
				this.addMessage(this.stringsService.disconnectNotification);
			}
			this.sessionService.close();
		}
	}

	/** Gets author ID for including in message list item. */
	protected async getAuthorID (_AUTHOR: Observable<string>) : Promise<string|undefined> {
		return undefined;
	}

	/** Gets default chat data. */
	protected getDefaultChatData () : IChatData {
		return {
			currentMessage: {},
			initProgress: new BehaviorSubject(0),
			isConnected: false,
			isDisconnected: false,
			isFriendTyping: new BehaviorSubject(false),
			isMessageChanged: false,
			lastConfirmedMessage: new LocalAsyncValue({id: '', index: 0}),
			messages: new LocalAsyncList<IChatMessage>(),
			/* See https://github.com/palantir/tslint/issues/3541 */
			/* tslint:disable-next-line:object-literal-sort-keys */
			messageValues: new LocalAsyncMap<string, IChatMessageValue>(),
			pendingMessages: new LocalAsyncList<IChatMessage&{pending: true}>(),
			receiveTextLock: lockFunction(),
			state: States.none,
			unconfirmedMessages: new BehaviorSubject<{[id: string]: boolean|undefined}>({})
		};
	}

	/** Aborts the process of chat initialisation and authentication. */
	public async abortSetup () : Promise<void> {
		this.chat.state	= States.aborted;
		this.sessionService.trigger(events.abort);
		this.sessionService.close();
		await this.dialogService.dismissToast();
	}

	/**
	 * Adds a message to the chat.
	 * @param timestamp If not set, will use util/getTimestamp().
	 * @param shouldNotify If true, a notification will be sent.
	 */
	/* tslint:disable-next-line:cyclomatic-complexity */
	public async addMessage (
		value: IChatMessageValue|string,
		author: Observable<string> = this.sessionService.appUsername,
		timestamp?: number,
		shouldNotify: boolean = author !== this.sessionService.localUsername,
		selfDestructTimeout?: number,
		dimensions?: IChatMessageLine[],
		id: string = uuid()
	) : Promise<void> {
		if (typeof value === 'string') {
			value	= {text: value};
		}

		if (
			!(
				value.calendarInvite ||
				value.form ||
				(value.quill && value.quill.length > 0) ||
				value.text
			) ||
			this.chat.state === States.aborted ||
			(author !== this.sessionService.appUsername && this.chat.isDisconnected)
		) {
			return;
		}

		if (!timestamp) {
			timestamp	= await getTimestamp();
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
			else if (value.text) {
				this.notificationService.notify(value.text);
			}
		}

		await Promise.all([
			this.chat.messageValues.setItem(id, value),
			(async () => {
				const chatMessage	= {
					authorID: await this.getAuthorID(author),
					authorType:
						author === this.sessionService.appUsername ?
							ChatMessage.AuthorTypes.App :
							author === this.sessionService.localUsername ?
								ChatMessage.AuthorTypes.Local :
								ChatMessage.AuthorTypes.Remote
					,
					dimensions,
					id,
					selfDestructTimeout,
					sessionSubID: this.sessionService.sessionSubID,
					timestamp
				};

				if (this.sessionInitService.ephemeral) {
					await this.chat.messages.pushValue(chatMessage);
				}
				else {
					await this.chat.pendingMessages.pushValue({
						...chatMessage,
						pending: true,
						value
					});
				}

				if (author === this.sessionService.localUsername) {
					await this.scrollService.scrollDown();
				}
				else if (author === this.sessionService.remoteUsername) {
					await this.scrollService.trackItem(id);
				}

				if (!this.sessionInitService.ephemeral) {
					await this.chat.messages.pushValue(chatMessage);
				}
			})()
		]);

		if (
			selfDestructTimeout !== undefined &&
			!isNaN(selfDestructTimeout) &&
			selfDestructTimeout > 0
		) {
			await sleep(selfDestructTimeout + 10000);

			await this.chat.messages.updateValue(async messages => {
				const i	= messages.findIndex(o => o.id === id);
				if (i >= 0) {
					messages.splice(i, 1);
				}
				return messages;
			});
		}
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
					undefined,
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
				this.addMessage(
					this.stringsService.introductoryMessage,
					undefined,
					(await getTimestamp()) - 30000,
					false
				);
			}

			this.initiated	= true;
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
		if (message.value === undefined) {
			message.value	= await this.chat.messageValues.getItem(message.id);

			if (message instanceof ChatMessage) {
				message.valueWatcher.next(message.value);
			}
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
	 * Checks for change to current message, and sends appropriate
	 * typing indicator signals through session.
	 */
	public async messageChange () : Promise<void> {
		return this.messageChangeLock(async () => {
			for (let i = 0 ; i < 2 ; ++i) {
				const isMessageChanged: boolean	=
					this.chat.currentMessage.text !== '' &&
					this.chat.currentMessage.text !== this.chat.previousMessage
				;

				this.chat.previousMessage	= this.chat.currentMessage.text;

				if (this.chat.isMessageChanged !== isMessageChanged) {
					this.chat.isMessageChanged	= isMessageChanged;
					this.sessionService.send([
						rpcEvents.typing,
						{chatState: {isTyping: this.chat.isMessageChanged}}
					]);

					await sleep(1000);
				}
			}
		});
	}

	/** Sends a message. */
	public async send (
		messageType: ChatMessageValue.Types = ChatMessageValue.Types.Text,
		message: IChatMessageLiveValue = {},
		selfDestructTimeout?: number,
		selfDestructChat: boolean = false,
		keepCurrentMessage: boolean = false
	) : Promise<void> {
		const value: IChatMessageValue				= {};
		const currentMessage: IChatMessageLiveValue	=
			keepCurrentMessage ? {} : this.chat.currentMessage
		;

		switch (messageType) {
			case ChatMessageValue.Types.CalendarInvite:
				value.calendarInvite			=
					(message && message.calendarInvite) ||
					this.chat.currentMessage.calendarInvite
				;
				currentMessage.calendarInvite	= undefined;
				if (!value.calendarInvite) {
					return;
				}
				break;

			case ChatMessageValue.Types.Form:
				value.form	= (message && message.form) || this.chat.currentMessage.form;
				currentMessage.form	= undefined;
				if (!value.form) {
					return;
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
					return;
				}
				break;

			case ChatMessageValue.Types.Text:
				value.text	= (message && message.text) || this.chat.currentMessage.text;
				currentMessage.text	= '';
				this.messageChange();
				if (!value.text) {
					return;
				}
				break;

			default:
				throw new Error('Invalid ChatMessageValue.Types value.');
		}

		const dimensions	= (
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
		).dimensions || [];

		await this.addTextMessage((await this.sessionService.send([
			rpcEvents.text,
			{text: {dimensions, selfDestructChat, selfDestructTimeout, value}}
		]))[0].data);
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
		protected readonly dialogService: DialogService,

		/** @ignore */
		protected readonly notificationService: NotificationService,

		/** @ignore */
		protected readonly p2pWebRTCService: P2PWebRTCService,

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
			const beginChat	= this.sessionService.one(events.beginChat);
			const callType	= this.sessionInitService.callType;

			this.p2pWebRTCService.initialCallPending	= callType !== undefined;

			this.unconfirmedMessagesSubscription		= combineLatest(
				this.chat.lastConfirmedMessage.watch(),
				this.chat.messages.watch()
			).pipe(map(([lastConfirmedMessage, messages]) => {
				const unconfirmedMessages: {[id: string]: boolean}	= {};

				for (let i = messages.length - 1 ; i >= 0 ; --i) {
					const id	= messages[i].id;
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

			beginChat.then(() => { this.begin(); });

			this.sessionService.one(events.closeChat).then(async () =>
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

			this.sessionService.on(rpcEvents.confirm, async (o: ISessionMessageData) => {
				if (!o.textConfirmation || !o.textConfirmation.id) {
					return;
				}

				const id		= o.textConfirmation.id;
				const messages	= await this.chat.messages.getValue();

				let newLastConfirmedMessage: IChatLastConfirmedMessage|undefined;
				for (let i = messages.length - 1 ; i >= 0 ; --i) {
					if (messages[i].id === id) {
						newLastConfirmedMessage	= {id, index: i};
						break;
					}
				}

				if (!newLastConfirmedMessage) {
					return;
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
			});

			this.sessionService.on(rpcEvents.typing, (o: ISessionMessageData) => {
				if (o.chatState) {
					this.chat.isFriendTyping.next(o.chatState.isTyping);
				}
			});

			this.chat.receiveTextLock(async lockData => {
				const f	= async (o: ISessionMessageData) => this.addTextMessage(o);
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
