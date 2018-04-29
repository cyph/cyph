/* tslint:disable:max-file-line-count */

import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {take} from 'rxjs/operators';
import {HandshakeSteps, IHandshakeState} from '../crypto/castle';
import {eventManager} from '../event-manager';
import {IAsyncList} from '../iasync-list';
import {IAsyncValue} from '../iasync-value';
import {LocalAsyncList} from '../local-async-list';
import {LocalAsyncValue} from '../local-async-value';
import {LockFunction} from '../lock-function-type';
import {
	BinaryProto,
	ISessionMessage,
	ISessionMessageData as ISessionMessageDataInternal,
	SessionMessageList
} from '../proto';
import {ISessionService} from '../service-interfaces/isession.service';
import {
	CastleEvents,
	events,
	ISessionMessageAdditionalData,
	ISessionMessageData,
	ProFeatures,
	rpcEvents
} from '../session';
import {normalize} from '../util/formatting';
import {lockFunction} from '../util/lock';
import {deserialize, serialize} from '../util/serialization';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {resolvable, sleep} from '../util/wait';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
import {CastleService} from './crypto/castle.service';
import {PotassiumService} from './crypto/potassium.service';
import {EnvService} from './env.service';
import {ErrorService} from './error.service';
import {SessionInitService} from './session-init.service';
import {StringsService} from './strings.service';


/**
 * Manages a session.
 */
@Injectable()
export abstract class SessionService implements ISessionService {
	/** @ignore */
	private readonly _OPENED					= resolvable(true);

	/** @ignore */
	private readonly _SYMMETRIC_KEY				= resolvable<Uint8Array>();

	/** @ignore */
	private readonly openEvents: Set<string>	= new Set();

	/** @ignore */
	private readonly resolveOpened: () => void	= this._OPENED.resolve;

	/** @ignore */
	protected readonly eventID: string									= uuid();

	/** @ignore */
	protected incomingMessageQueue: IAsyncList<ISessionMessage>			= new LocalAsyncList();

	/** @ignore */
	protected incomingMessageQueueLock: LockFunction					= lockFunction();

	/** @ignore */
	protected lastIncomingMessageTimestamp: number						= 0;

	/** @ignore */
	protected readonly plaintextSendInterval: number					= 1776;

	/** @ignore */
	protected readonly plaintextSendQueue: {
		messages: ISessionMessage[];
		resolve: () => void;
	}[]	= [];

	/** @ignore */
	protected readonly receivedMessages: Set<string>					= new Set<string>();

	/** @ignore */
	protected resolveSymmetricKey?: (symmetricKey: Uint8Array) => void	=
		this._SYMMETRIC_KEY.resolve
	;

	/**
	 * Session key for misc stuff like locking.
	 * TODO: Either change how AccountSessionService.setUser works or make this an observable.
	 */
	protected readonly symmetricKey: Promise<Uint8Array>				=
		this._SYMMETRIC_KEY.promise
	;

	/** @inheritDoc */
	public readonly apiFlags								= {
		disableP2P: !!(
			this.envService.environment.customBuild &&
			this.envService.environment.customBuild.config.disableP2P
		),
		modestBranding: false
	};

	/** @inheritDoc */
	public readonly appUsername: Observable<string>			= of('');

	/** @inheritDoc */
	public readonly closed: Promise<void>					= this.one<void>(events.closeChat);

	/** @inheritDoc */
	public readonly connected: Promise<void>				= this.one<void>(events.connect);

	/** @inheritDoc */
	public readonly freezePong: BehaviorSubject<boolean>	= new BehaviorSubject(false);

	/** @inheritDoc */
	public readonly localUsername: Observable<string>		= new BehaviorSubject<string>(
		this.stringsService.me
	);

	/** @ignore */
	public readonly opened: Promise<boolean>				= this._OPENED.promise;

	/** @inheritDoc */
	public readonly ready: Promise<void>					= Promise.resolve();

	/** @inheritDoc */
	public readonly remoteUsername: BehaviorSubject<string>	= new BehaviorSubject<string>(
		this.stringsService.friend
	);

	/** @see ISessionMessageData.sessionSubID */
	public sessionSubID?: string;

	/** @inheritDoc */
	public readonly state									= {
		cyphID: '',
		isAlice: false,
		isAlive: true,
		sharedSecret: '',
		startingNewCyph: <boolean|undefined> false,
		wasInitiatedByAPI: false
	};

	/** Sends messages through Castle. */
	protected async castleSendMessages (messages: ISessionMessage[]) : Promise<void> {
		await this.castleService.send(await serialize(SessionMessageList, {messages}));
	}

	/** @see IChannelHandlers.onClose */
	protected async channelOnClose () : Promise<void> {
		this.destroy();
	}

	/** @see IChannelHandlers.onConnect */
	protected async channelOnConnect () : Promise<void> {
		this.trigger(events.connect);
	}

	/** @see IChannelHandlers.onMessage */
	protected async channelOnMessage (message: Uint8Array) : Promise<void> {
		if (this.state.isAlive) {
			await this.castleService.receive(message);
		}
	}

	/** @see IChannelHandlers.onOpen */
	protected async channelOnOpen (isAlice: boolean, sendLoop: boolean = true) : Promise<void> {
		this.state.isAlice	= isAlice;
		this.resolveOpened();

		if (!sendLoop) {
			return;
		}

		while (this.state.isAlive) {
			await sleep(this.plaintextSendInterval);

			if (this.plaintextSendQueue.length < 1) {
				continue;
			}

			const messageGroups	= this.plaintextSendQueue.splice(
				0,
				this.plaintextSendQueue.length
			);

			const messages		= messageGroups.
				map(o => o.messages).
				reduce((a, b) => a.concat(b), [])
			;

			await this.castleSendMessages(messages);

			for (const {resolve} of messageGroups) {
				resolve();
			}
		}
	}

	/** @ignore */
	protected async cyphertextReceiveHandler (message: ISessionMessage) : Promise<void> {
		if ((message.data.sessionSubID || undefined) !== this.sessionSubID) {
			throw new Error('Different sub-session.');
		}

		if (!message.data.id || this.receivedMessages.has(message.data.id)) {
			return;
		}

		const author	= await this.getSessionMessageAuthor(message.data);
		if (author) {
			(<any> message.data).author	= author;
		}

		this.receivedMessages.add(message.data.id);

		if (message.event && message.event in rpcEvents) {
			this.trigger(message.event, message.data);
		}
	}

	/** @ignore */
	protected async cyphertextSendHandler (message: Uint8Array) : Promise<void> {
		await this.channelService.send(message);

		this.analyticsService.sendEvent({
			eventAction: 'sent',
			eventCategory: 'message',
			eventValue: 1,
			hitType: 'event'
		});
	}

	/** @ignore */
	protected async getSessionMessageAuthor (
		message: ISessionMessageDataInternal
	) : Promise<Observable<string>|void> {}

	/** @ignore */
	protected async newMessages (
		messages: [string, ISessionMessageAdditionalData][]
	) : Promise<(ISessionMessage&{data: ISessionMessageData})[]> {
		const newMessages: (ISessionMessage&{data: ISessionMessageData})[]	= [];

		for (const message of messages) {
			const [event, additionalData]	= message;

			const data: ISessionMessageData	= {
				author: this.localUsername,
				bytes: additionalData.bytes,
				capabilities: additionalData.capabilities,
				chatState: additionalData.chatState,
				command: additionalData.command,
				id: uuid(),
				sessionSubID: this.sessionSubID,
				text: additionalData.text,
				textConfirmation: additionalData.textConfirmation,
				timestamp: await getTimestamp(),
				transfer: additionalData.transfer
			};

			newMessages.push({event, data});
		}

		return newMessages;
	}

	/** @ignore */
	protected async plaintextSendHandler (messages: ISessionMessage[]) : Promise<void> {
		const {promise, resolve}	= resolvable();
		this.plaintextSendQueue.push({messages, resolve});
		return promise;
	}

	/** @inheritDoc */
	public async castleHandler (
		event: CastleEvents,
		data?: Uint8Array|{author: Observable<string>; plaintext: Uint8Array; timestamp: number}
	) : Promise<void> {
		switch (event) {
			case CastleEvents.abort: {
				this.errorService.log('CYPH AUTHENTICATION FAILURE');
				this.trigger(events.connectFailure);
				break;
			}
			case CastleEvents.connect: {
				this.trigger(events.beginChat);

				if (!this.resolveSymmetricKey) {
					return;
				}

				if (this.state.isAlice) {
					const potassiumService	= this.potassiumService;
					const symmetricKey		= potassiumService.randomBytes(
						await potassiumService.secretBox.keyBytes
					);
					this.resolveSymmetricKey(symmetricKey);
					this.send([rpcEvents.symmetricKey, {bytes: symmetricKey}]);
				}
				else {
					this.resolveSymmetricKey(
						(await this.one<ISessionMessageData>(rpcEvents.symmetricKey)).bytes ||
						new Uint8Array(0)
					);
				}

				break;
			}
			case CastleEvents.receive: {
				if (!data || data instanceof Uint8Array) {
					break;
				}

				const cyphertextTimestamp	= data.timestamp;

				const messages	=
					(
						await (async () =>
							(
								await deserialize(SessionMessageList, data.plaintext)
							).messages
						)().catch(() => undefined)
					) ||
					[]
				;

				const authorID	= normalize(await data.author.pipe(take(1)).toPromise());

				for (const message of messages) {
					/* Discard messages without valid timestamps */
					if (
						isNaN(message.data.timestamp) ||
						message.data.timestamp > cyphertextTimestamp ||
						message.data.timestamp < this.lastIncomingMessageTimestamp
					) {
						continue;
					}

					this.lastIncomingMessageTimestamp	= message.data.timestamp;
					(<any> message.data).author			= data.author;
					message.data.authorID				= authorID;

					await this.incomingMessageQueue.pushValue(message);
				}
				break;
			}
			case CastleEvents.send: {
				if (!data || !(data instanceof Uint8Array)) {
					break;
				}

				await this.cyphertextSendHandler(data);
			}
		}
	}

	/** @inheritDoc */
	public close () : void {
		this.channelService.close();
	}

	/** @inheritDoc */
	public async destroy () : Promise<void> {
		if (!this.state.isAlive) {
			return;
		}

		this.state.isAlive	= false;
		this.trigger(events.closeChat);

		for (const event of Array.from(this.openEvents)) {
			this.off(event);
		}

		this.channelService.destroy();
	}

	/** @inheritDoc */
	public async handshakeState (
		currentStep: IAsyncValue<HandshakeSteps> =
			new LocalAsyncValue(HandshakeSteps.Start)
		,
		initialSecret: IAsyncValue<Uint8Array|undefined> =
			new LocalAsyncValue<Uint8Array|undefined>(undefined)
	) : Promise<IHandshakeState> {
		await this.opened;

		return {
			currentStep,
			initialSecret,
			initialSecretAliceCyphertext: await this.channelService.getAsyncValue(
				'handshake/initialSecretAliceCyphertext',
				BinaryProto,
				true
			),
			initialSecretBobCyphertext: await this.channelService.getAsyncValue(
				'handshake/initialSecretBobCyphertext',
				BinaryProto,
				true
			),
			isAlice: this.state.isAlice,
			localPublicKey: await this.channelService.getAsyncValue(
				`handshake/${this.state.isAlice ? 'alice' : 'bob'}PublicKey`,
				BinaryProto,
				true
			),
			remotePublicKey: await this.channelService.getAsyncValue(
				`handshake/${this.state.isAlice ? 'bob' : 'alice'}PublicKey`,
				BinaryProto,
				true
			)
		};
	}

	/** @inheritDoc */
	public async init (channelID?: string, userID?: string) : Promise<void> {
		this.incomingMessageQueueLock(async o => {
			this.incomingMessageQueue.subscribeAndPop(async message =>
				this.cyphertextReceiveHandler(message)
			);

			await Promise.race([this.closed, o.stillOwner.toPromise()]);
		});

		await Promise.all([
			this.castleService.init(this.potassiumService, this),
			this.channelService.init(channelID, userID, {
				onClose: async () => this.channelOnClose(),
				onConnect: async () => this.channelOnConnect(),
				onMessage: async (message: Uint8Array) => this.channelOnMessage(message),
				onOpen: async (isAlice: boolean) => this.channelOnOpen(isAlice)
			})
		]);
	}

	/** @inheritDoc */
	public async lock<T> (
		f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
		reason?: string
	) : Promise<T> {
		return this.channelService.lock(
			async o => {
				if (o.reason) {
					o.reason	= this.potassiumService.toString(
						await this.potassiumService.secretBox.open(
							this.potassiumService.fromBase64(o.reason),
							await this.symmetricKey
						)
					);
				}

				return f(o);
			},
			!reason ? undefined : this.potassiumService.toBase64(
				await this.potassiumService.secretBox.seal(
					this.potassiumService.fromString(reason),
					await this.symmetricKey
				)
			)
		);
	}

	/** @inheritDoc */
	public off<T> (event: string, handler?: (data: T) => void) : void {
		eventManager.off<T>(event + this.eventID, handler);
	}

	/** @inheritDoc */
	public on<T> (event: string, handler: (data: T) => void) : void {
		this.openEvents.add(event);
		eventManager.on<T>(event + this.eventID, handler);
	}

	/** @inheritDoc */
	public async one<T> (event: string) : Promise<T> {
		this.openEvents.add(event);
		return eventManager.one<T>(event + this.eventID);
	}

	/** @inheritDoc */
	public get proFeatures () : ProFeatures {
		return new ProFeatures();
	}

	/** @inheritDoc */
	public async send (
		...messages: [string, ISessionMessageAdditionalData][]
	) : Promise<(ISessionMessage&{data: ISessionMessageData})[]> {
		const newMessages	= await this.newMessages(messages);
		this.plaintextSendHandler(newMessages);
		return newMessages;
	}

	/** @inheritDoc */
	public async sendAndAwaitConfirmation (
		...messages: [string, ISessionMessageAdditionalData][]
	) : Promise<(ISessionMessage&{data: ISessionMessageData})[]> {
		const newMessages	= await this.newMessages(messages);
		await this.plaintextSendHandler(newMessages);
		return newMessages;
	}

	/** @inheritDoc */
	public trigger (event: string, data?: any) : void {
		eventManager.trigger(event + this.eventID, data);
	}

	/** @inheritDoc */
	public async yt () : Promise<void> {}

	constructor (
		/** @ignore */
		protected readonly analyticsService: AnalyticsService,

		/** @ignore */
		protected readonly castleService: CastleService,

		/** @ignore */
		protected readonly channelService: ChannelService,

		/** @ignore */
		protected readonly envService: EnvService,

		/** @ignore */
		protected readonly errorService: ErrorService,

		/** @ignore */
		protected readonly potassiumService: PotassiumService,

		/** @ignore */
		protected readonly sessionInitService: SessionInitService,

		/** @ignore */
		protected readonly stringsService: StringsService
	) {
		this.sessionInitService.sessionService.resolve(this);
	}
}
