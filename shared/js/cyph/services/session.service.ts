/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, of, ReplaySubject} from 'rxjs';
import {take} from 'rxjs/operators';
import {BaseProvider} from '../base-provider';
import {HandshakeSteps, IHandshakeState} from '../crypto/castle';
import {IAsyncList} from '../iasync-list';
import {IAsyncValue} from '../iasync-value';
import {ListHoleError} from '../list-hole-error';
import {LocalAsyncList} from '../local-async-list';
import {LocalAsyncValue} from '../local-async-value';
import {LockFunction} from '../lock-function-type';
import {MaybePromise} from '../maybe-promise-type';
import {
	BinaryProto,
	ISessionMessage,
	ISessionMessageData as ISessionMessageDataInternal,
	ISessionMessageList,
	SessionMessageList
} from '../proto';
import {IP2PWebRTCService} from '../service-interfaces/ip2p-webrtc.service';
import {ISessionService} from '../service-interfaces/isession.service';
import {
	CastleEvents,
	EventManager,
	ISessionMessageAdditionalData,
	ISessionMessageData,
	ProFeatures,
	RpcEvents
} from '../session';
import {filterUndefined, filterUndefinedOperator} from '../util/filter';
import {normalize} from '../util/formatting';
import {getOrSetDefault} from '../util/get-or-set-default';
import {lockFunction} from '../util/lock';
import {debugLog, debugLogError} from '../util/log';
import {deserialize, serialize} from '../util/serialization';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {resolvable, resolvedResolvable, sleep} from '../util/wait';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
import {CastleService} from './crypto/castle.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {ErrorService} from './error.service';
import {SessionInitService} from './session-init.service';
import {SessionWrapperService} from './session-wrapper.service';
import {StringsService} from './strings.service';

/**
 * Manages a session.
 */
@Injectable()
export abstract class SessionService extends BaseProvider
	implements ISessionService {
	/** @ignore */
	private readonly eventManager = new EventManager();

	/** Indicates whether or not this is an Accounts instance. */
	protected readonly account: boolean = false;

	/** @ignore */
	protected incomingMessageQueue: IAsyncList<
		ISessionMessageList | ListHoleError
	> = new LocalAsyncList<ISessionMessageList | ListHoleError>();

	/** @ignore */
	protected incomingMessageQueueLock: LockFunction = lockFunction();

	/** @ignore */
	protected lastIncomingMessageTimestamp: number = 0;

	/** @ignore */
	protected readonly opened = resolvable<true>(true);

	/** @ignore */
	protected readonly receivedMessages: Set<string> = new Set<string>();

	/** @inheritDoc */
	public readonly aborted = resolvable<true>(true);

	/** @inheritDoc */
	public readonly apiFlags = {
		disableP2P: !!this.envService.environment.customBuild?.config
			.disableP2P,
		modestBranding: false
	};

	/** @inheritDoc */
	public readonly appUsername: Observable<string> = of('');

	/** @inheritDoc */
	public readonly beginChat = resolvable<true>(true);

	/** @inheritDoc */
	public readonly beginChatComplete = resolvable<true>(true);

	/** @inheritDoc */
	public readonly beginWaiting = resolvable<true>(true);

	/** @inheritDoc */
	public readonly channelConnected = resolvable<true>(true);

	/** @inheritDoc */
	public readonly chatRequestUsername: BehaviorSubject<
		string | undefined
	> = new BehaviorSubject<string | undefined>(undefined);

	/** @inheritDoc */
	public readonly closed = resolvable<true>(true);

	/** @inheritDoc */
	public readonly connected = resolvable<true>(true);

	/** @inheritDoc */
	public readonly connectFailure = resolvable<true>(true);

	/** @inheritDoc */
	public readonly cyphNotFound = resolvable<true>(true);

	/** @inheritDoc */
	public readonly cyphertext = new ReplaySubject<{
		author: Observable<string>;
		cyphertext: Uint8Array;
	}>();

	/** @inheritDoc */
	public readonly freezePong: BehaviorSubject<boolean> = new BehaviorSubject<
		boolean
	>(false);

	/** @inheritDoc */
	public group?: SessionService[];

	/** @inheritDoc */
	public readonly initialMessagesProcessed = resolvable<true>(true);

	/** @inheritDoc */
	public readonly localUsername: Observable<string> = new BehaviorSubject<
		string
	>(this.stringsService.me);

	/** @inheritDoc */
	public readonly p2pWebRTCService = resolvable<IP2PWebRTCService>();

	/** @inheritDoc */
	public pairwiseSessionData?: {
		localUsername?: string;
		remoteUsername?: string;
	};

	/** @inheritDoc */
	public readonly prepareForCallTypeError: BehaviorSubject<
		string | undefined
	> = new BehaviorSubject<string | undefined>(undefined);

	/** @inheritDoc */
	public readonly ready = resolvedResolvable<true>(true);

	/** @inheritDoc */
	public readonly remoteUsername: BehaviorSubject<
		string
	> = new BehaviorSubject<string>(this.stringsService.friend);

	/** @see ISessionMessageData.sessionSubID */
	public sessionSubID?: string;

	/** @inheritDoc */
	public readonly state = {
		cyphID: new BehaviorSubject(''),
		ephemeralStateInitialized: new BehaviorSubject<boolean>(false),
		isAlice: new BehaviorSubject<boolean>(false),
		isAlive: new BehaviorSubject<boolean>(true),
		isConnected: new BehaviorSubject<boolean>(false),
		sharedSecret: new BehaviorSubject<string | undefined>(undefined),
		startingNewCyph: new BehaviorSubject<boolean | undefined>(false),
		wasInitiatedByAPI: new BehaviorSubject<boolean>(false)
	};

	/** @inheritDoc */
	public readonly symmetricKey = new BehaviorSubject<Uint8Array | undefined>(
		undefined
	);

	/** @ignore */
	private readonly correctSubSession = (message: ISessionMessage) : boolean =>
		(message.data.sessionSubID || undefined) === this.sessionSubID;

	/** Aborts session handshake. */
	protected async abortSetup () : Promise<void> {
		this.state.sharedSecret.next(undefined);
		this.errorService.log('CYPH AUTHENTICATION FAILURE');
		this.connectFailure.resolve();
	}

	/** Sends messages through Castle. */
	protected async castleSendMessages (
		messages: ISessionMessage[]
	) : Promise<void> {
		if (messages.length < 1) {
			return;
		}

		await this.castleService.send(
			await serialize<ISessionMessageList>(SessionMessageList, {
				messages
			}),
			messages[0].data.timestamp
		);
	}

	/** @see IChannelHandlers.onClose */
	protected async channelOnClose () : Promise<void> {
		await this.destroy();
	}

	/** @see IChannelHandlers.onConnect */
	protected async channelOnConnect () : Promise<void> {
		this.channelConnected.resolve();
		await Promise.all([
			this.castleService.ready,
			this.channelService.initialMessagesProcessed
		]);
		this.state.isConnected.next(true);
		this.connected.resolve();
	}

	/** @see IChannelHandlers.onMessage */
	protected async channelOnMessage (
		message: Uint8Array,
		initial: boolean
	) : Promise<void> {
		if (this.state.isAlive.value) {
			await this.castleService.receive(message, initial);
		}
	}

	/** @see IChannelHandlers.onOpen */
	/* eslint-disable-next-line @typescript-eslint/require-await */
	protected async channelOnOpen (isAlice: boolean) : Promise<void> {
		this.state.isAlice.next(isAlice);
		this.opened.resolve();
	}

	/** @ignore */
	protected async cyphertextReceiveHandler (
		messages: ISessionMessage[],
		initial?: boolean
	) : Promise<void> {
		debugLog(() => ({cyphertextReceiveHandler: {messages}}));

		const messageGroups = new Map<RpcEvents, ISessionMessageData[]>();

		const otherSubSessionMessages = messages.filter(
			message => !this.correctSubSession(message)
		);

		if (otherSubSessionMessages.length > 0) {
			await this.incomingMessageQueue.pushItem({
				messages: otherSubSessionMessages
			});
		}

		await Promise.all(
			messages.filter(this.correctSubSession).map(async message => {
				if (
					!message.data.id ||
					this.receivedMessages.has(message.data.id)
				) {
					return;
				}

				const data = await this.processMessageData(
					message.data,
					initial
				);

				message.data = data;

				if (!(message.event && message.event in RpcEvents)) {
					return;
				}

				getOrSetDefault(messageGroups, message.event, () => []).push(
					data
				);
			})
		);

		for (const [event, data] of Array.from(messageGroups.entries())) {
			this.trigger(event, data);

			for (const {id} of data) {
				this.receivedMessages.add(id);
			}
		}
	}

	/** @ignore */
	protected async cyphertextSendHandler (
		message: Uint8Array
	) : Promise<void> {
		await this.channelService.send(message);

		this.analyticsService.sendEvent('message', 'sent');
	}

	/** @ignore */
	/* eslint-disable-next-line @typescript-eslint/require-await */
	protected async getSessionMessageAuthor (
		_MESSAGE: ISessionMessageDataInternal
	) : Promise<Observable<string> | undefined> {
		return;
	}

	/** @ignore */
	protected async getSymmetricKey () : Promise<Uint8Array> {
		return (
			this.symmetricKey.value ||
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			this.symmetricKey
				.pipe(filterUndefinedOperator(), take(1))
				.toPromise()
		);
	}

	/** @ignore */
	protected async newMessages (
		messages: [
			string,
			(
				| ISessionMessageAdditionalData
				| ((
						timestamp: number
				  ) => MaybePromise<ISessionMessageAdditionalData>)
			)
		][]
	) : Promise<(ISessionMessage & {data: ISessionMessageData})[]> {
		return Promise.all(
			messages.map(async message => {
				const timestamp = await getTimestamp();
				const event = message[0];
				let additionalData = message[1];

				if (typeof additionalData === 'function') {
					additionalData = await additionalData(timestamp);
				}

				return {
					data: {
						author: this.localUsername,
						bytes: additionalData.bytes,
						chatState: additionalData.chatState,
						command: additionalData.command,
						id: additionalData.id || uuid(),
						initial: false,
						sessionSubID: this.sessionSubID,
						text: additionalData.text,
						textConfirmation: additionalData.textConfirmation,
						timestamp
					},
					event
				};
			})
		);
	}

	/** @ignore */
	protected async plaintextSendHandler (
		messages: ISessionMessage[]
	) : Promise<void> {
		if (this.group) {
			await Promise.all(
				this.group.map(async session =>
					session.plaintextSendHandler(messages)
				)
			);

			return;
		}

		await this.castleSendMessages(messages);
	}

	/**
	 * Sets group, handling events on individual pairwise sessions
	 * and performing equivalent behavior.
	 */
	protected setGroup (group: SessionService[]) : void {
		if (group.length < 1) {
			throw new Error('Cannot create empty group.');
		}

		this.group = group;

		const confirmations = new Map<string, Set<SessionService>>();

		for (const session of group) {
			session.on(RpcEvents.confirm, newEvents => {
				this.trigger(
					RpcEvents.confirm,
					filterUndefined(
						newEvents.map(o => {
							if (!o.textConfirmation || !o.textConfirmation.id) {
								return;
							}

							const confirmedSessions = getOrSetDefault(
								confirmations,
								o.textConfirmation.id,
								() => new Set<SessionService>()
							);

							confirmedSessions.add(session);

							if (confirmedSessions.size === group.length) {
								confirmations.delete(o.textConfirmation.id);
								return o;
							}

							return;
						})
					)
				);
			});

			for (const rpcEvent of [
				RpcEvents.text,
				...(this.sessionInitService.ephemeral ? [RpcEvents.typing] : [])
			]) {
				session.on(rpcEvent, newEvents => {
					this.trigger(rpcEvent, newEvents);
				});
			}
		}

		for (const {all, always, event} of <
			{
				all?: boolean;
				always?: boolean;
				event:
					| 'beginChat'
					| 'closed'
					| 'connected'
					| 'channelConnected'
					| 'connectFailure'
					| 'cyphNotFound'
					| 'initialMessagesProcessed'
					| 'opened'
					| 'ready';
			}[]
		> [
			{event: 'beginChat'},
			{all: true, event: 'closed'},
			{event: 'connected'},
			{event: 'channelConnected'},
			{event: 'connectFailure'},
			{event: 'cyphNotFound'},
			{all: true, event: 'initialMessagesProcessed'},
			{all: true, event: 'opened'},
			{all: true, event: 'ready'}
		]) {
			const callback = async () => this[event].resolve();

			if (always) {
				callback();
				continue;
			}

			const promises = group.map(async session => session[event]);

			if (all) {
				Promise.all(promises).then(callback);
			}
			else {
				Promise.race(promises).then(callback);
			}
		}
	}

	/** Trigger event. */
	protected trigger (event: RpcEvents, data: ISessionMessageData[]) : void {
		this.eventManager.trigger(event, data);
	}

	/** @inheritDoc */
	public async castleHandler (
		event: CastleEvents,
		data?:
			| Uint8Array
			| {
					author: Observable<string>;
					initial: boolean;
					instanceID: string;
					plaintext: Uint8Array;
					timestamp: number;
			  }
	) : Promise<void> {
		switch (event) {
			case CastleEvents.abort:
				await this.abortSetup();
				break;

			case CastleEvents.connect:
				this.connected.then(async () => {
					this.state.sharedSecret.next(undefined);

					if (await this.sessionInitService.headless) {
						return;
					}

					this.beginChat.resolve();
				});
				break;

			case CastleEvents.receive:
				if (!data || data instanceof Uint8Array) {
					break;
				}

				const castleTimestamp = data.timestamp;

				debugLog(() => ({sessionCastleReceive: data}));

				const messages =
					(await (async () =>
						(await deserialize(SessionMessageList, data.plaintext))
							.messages)().catch(() => undefined)) || [];

				debugLog(() => ({
					sessionCastleReceiveMessages: {data, messages}
				}));

				const authorID = normalize(
					await data.author.pipe(take(1)).toPromise()
				);

				await this.cyphertextReceiveHandler(
					filterUndefined(
						messages.map(message => {
							/* Log messages without valid timestamps */
							if (
								isNaN(message.data.timestamp) ||
								message.data.timestamp < castleTimestamp
							) {
								debugLogError(() => ({
									cyphertextReceiveInvalidTimestamp: {
										message,
										timestamp: message.data.timestamp
									}
								}));
							}
							else {
								this.lastIncomingMessageTimestamp =
									message.data.timestamp;
							}

							(<any> message.data).author = data.author;
							message.data.authorID = authorID;

							return message;
						})
					),
					data.initial
				);

				break;

			case CastleEvents.send:
				if (!data || !(data instanceof Uint8Array)) {
					break;
				}

				debugLog(() => ({
					sessionCastleSendMessage: {data}
				}));

				await this.cyphertextSendHandler(data);
		}
	}

	/** @inheritDoc */
	public close () : void {
		if (this.group) {
			for (const session of this.group) {
				session.close();
			}

			return;
		}

		this.channelService.close();
	}

	/** @inheritDoc */
	public async destroy () : Promise<void> {
		if (!this.state.isAlive.value || this.group) {
			return;
		}

		(await this.p2pWebRTCService).close();

		this.state.isAlive.next(false);
		this.closed.resolve();
		this.eventManager.clear();
		this.channelService.destroy();
	}

	/** @inheritDoc */
	public async handshakeState (
		currentStep: IAsyncValue<HandshakeSteps> = new LocalAsyncValue(
			HandshakeSteps.Start
		),
		initialSecret: IAsyncValue<
			Uint8Array | undefined
		> = new LocalAsyncValue<Uint8Array | undefined>(undefined),
		forceAlice?: boolean
	) : Promise<IHandshakeState> {
		await this.opened;

		const isAlice =
			typeof forceAlice === 'boolean' ?
				forceAlice :
				this.state.isAlice.value;

		return {
			currentStep,
			initialSecret,
			initialSecretCyphertext: await this.channelService.getAsyncValue(
				'handshakeState/initialSecretCyphertext',
				BinaryProto,
				true,
				this.subscriptions
			),
			isAlice,
			localPublicKey: await this.channelService.getAsyncValue(
				`handshakeState/${isAlice ? 'alice' : 'bob'}PublicKey`,
				BinaryProto,
				true,
				this.subscriptions
			),
			remotePublicKey: await this.channelService.getAsyncValue(
				`handshakeState/${isAlice ? 'bob' : 'alice'}PublicKey`,
				BinaryProto,
				true,
				this.subscriptions
			)
		};
	}

	/** @inheritDoc */
	public async init (
		channelID?: string,
		channelSubID?: string,
		userID?: string
	) : Promise<void> {
		await Promise.all([
			this.castleService.init(this),
			this.channelService.init(
				channelID,
				channelSubID,
				userID,
				this.state.startingNewCyph.value === undefined,
				this.account,
				{
					onClose: async () => this.channelOnClose(),
					onConnect: async () => this.channelOnConnect(),
					onMessage: async (message, initial) =>
						this.channelOnMessage(message, initial),
					onOpen: async isAlice => this.channelOnOpen(isAlice)
				}
			)
		]);

		let lockClaimed = false;

		if (this.sessionInitService.ephemeral) {
			this.initialMessagesProcessed.resolve();
		}
		else {
			/*
				Honeybadger workaround: see comment on the equivalent logic in the
				PairwiseSession constructor
			*/
			sleep(2500).then(() => {
				if (!lockClaimed) {
					this.initialMessagesProcessed.resolve();
				}
			});
		}

		this.incomingMessageQueueLock(async o => {
			lockClaimed = true;

			if (!this.sessionInitService.ephemeral) {
				await this.cyphertextReceiveHandler(
					this.databaseService
						.filterListHoles(
							await this.incomingMessageQueue.getValue()
						)
						.flatMap(({messages}) => messages || [])
						.filter(this.correctSubSession),
					true
				);

				this.initialMessagesProcessed.resolve();
			}

			const sub = this.incomingMessageQueue.subscribeAndPop(
				async sessionMessageList => {
					if (sessionMessageList instanceof ListHoleError) {
						return;
					}

					const {messages} = sessionMessageList;

					if (!messages || messages.length < 1) {
						return;
					}

					if (!this.correctSubSession(messages[0])) {
						throw new Error('Different sub-session.');
					}

					await this.cyphertextReceiveHandler(messages);
				}
			);

			await Promise.race([this.closed, o.stillOwner.toPromise()]);
			sub.unsubscribe();
		});
	}

	/** @inheritDoc */
	public async lock<T> (
		f: (o: {
			reason?: string;
			stillOwner: BehaviorSubject<boolean>;
		}) => Promise<T>,
		reason?: string
	) : Promise<T> {
		return this.channelService.lock(
			async o => {
				if (o.reason) {
					o.reason = this.potassiumService.toString(
						await this.potassiumService.secretBox.open(
							this.potassiumService.fromBase64(o.reason),
							await this.getSymmetricKey()
						)
					);
				}

				return f(o);
			},
			!reason ?
				undefined :
				this.potassiumService.toBase64(
					await this.potassiumService.secretBox.seal(
						this.potassiumService.fromString(reason),
						await this.getSymmetricKey()
					)
				)
		);
	}

	/** @inheritDoc */
	public off (
		event: RpcEvents,
		handler?: (data: ISessionMessageData[]) => void
	) : void {
		this.eventManager.off(event, handler);
	}

	/** @inheritDoc */
	public on (
		event: RpcEvents,
		handler: (data: ISessionMessageData[]) => void
	) : void {
		this.eventManager.on(event, handler);
	}

	/** @inheritDoc */
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	public async one (event: RpcEvents) : Promise<ISessionMessageData[]> {
		return this.eventManager.one(event);
	}

	/** @inheritDoc */
	public async prepareForCallType (
		callType: 'audio' | 'video' | undefined = this.sessionInitService
			.callType
	) : Promise<void> {
		if (!callType || !this.envService.isWeb) {
			return;
		}

		const p2pWebRTCService = await this.p2pWebRTCService;

		/* Workaround for lint false positive bug */
		/* eslint-disable-next-line prefer-const */
		let localStream: MediaStream | undefined;

		const device =
			callType === 'video' ?
				this.stringsService.ioPermissionDeviceVideo :
				this.stringsService.ioPermissionDeviceAudio;

		const closeRequestAlert = resolvable<() => void>();

		(async () => {
			await sleep(10000);

			if (localStream) {
				closeRequestAlert.resolve(() => {});
				return;
			}

			await this.dialogService.alert(
				{
					content: this.stringsService.setParameters(
						this.stringsService.ioPermissionRequestContent,
						{
							device
						}
					),
					title: this.stringsService.ioPermissionRequestTitle
				},
				closeRequestAlert
			);
		})();

		localStream = await p2pWebRTCService.initUserMedia(callType);

		closeRequestAlert.then(async f => f()).catch(() => {});

		if (localStream) {
			this.prepareForCallTypeError.next(undefined);

			(async () =>
				(await p2pWebRTCService.handlers).passiveAcceptConfirm(
					callType
				))().catch(() => {});

			return;
		}

		const prepareForCallTypeError = this.stringsService.setParameters(
			this.stringsService.ioPermissionErrorContent,
			{
				device
			}
		);

		this.prepareForCallTypeError.next(prepareForCallTypeError);

		await this.dialogService.alert({
			content: prepareForCallTypeError,
			title: this.stringsService.ioPermissionErrorTitle
		});

		throw new Error('Failed to initialize user media.');
	}

	/** @inheritDoc */
	public async processMessageData (
		data: ISessionMessageDataInternal,
		initial: boolean = false
	) : Promise<ISessionMessageData> {
		const author = await this.getSessionMessageAuthor(data);
		if (author) {
			(<any> data).author = author;
		}
		(<any> data).initial = initial;
		return <any> data;
	}

	/** @inheritDoc */
	public get proFeatures () : ProFeatures {
		return new ProFeatures();
	}

	/** @inheritDoc */
	public async send (
		...messages: [
			string,

			(
				| ISessionMessageAdditionalData
				| ((
						timestamp: number
				  ) => MaybePromise<ISessionMessageAdditionalData>)
			)
		][]
	) : Promise<{
		confirmPromise: Promise<void>;
		newMessages: (ISessionMessage & {data: ISessionMessageData})[];
	}> {
		const newMessages = await this.newMessages(messages);

		return {
			confirmPromise: this.plaintextSendHandler(newMessages),
			newMessages
		};
	}

	/** @inheritDoc */
	public spawn (
		_SESSION_INIT_SERVICE?: SessionInitService,
		_CASTLE_SERVICE?: CastleService
	) : SessionService {
		throw new Error(
			'Must provide an implementation of SessionService.spawn.'
		);
	}

	constructor (
		/** @ignore */
		protected readonly analyticsService: AnalyticsService,

		/** @ignore */
		protected readonly castleService: CastleService,

		/** @ignore */
		protected readonly channelService: ChannelService,

		/** @ignore */
		protected readonly databaseService: DatabaseService,

		/** @ignore */
		protected readonly dialogService: DialogService,

		/** @ignore */
		protected readonly envService: EnvService,

		/** @ignore */
		protected readonly errorService: ErrorService,

		/** @ignore */
		protected readonly potassiumService: PotassiumService,

		/** @ignore */
		protected readonly sessionInitService: SessionInitService,

		/** @ignore */
		protected readonly sessionWrapperService: SessionWrapperService,

		/** @ignore */
		protected readonly stringsService: StringsService
	) {
		super();

		this.sessionWrapperService.sessionService.resolve(this);
	}
}
