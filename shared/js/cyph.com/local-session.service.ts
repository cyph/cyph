import {Injectable} from '@angular/core';
import {potassiumUtil} from '../cyph/crypto/potassium/potassium-util';
import {eventManager} from '../cyph/event-manager';
import {ISessionService} from '../cyph/service-interfaces/isession-service';
import {EnvService} from '../cyph/services/env.service';
import {StringsService} from '../cyph/services/strings.service';
import {Events, events, RpcEvents, rpcEvents, Users, users} from '../cyph/session/enums';
import {IMessage} from '../cyph/session/imessage';
import {Message} from '../cyph/session/message';
import {ProFeatures} from '../cyph/session/profeatures';
import {util} from '../cyph/util';
import {ChatData} from './chat-data';


/**
 * Mocks session service and communicates locally.
 */
@Injectable()
export class LocalSessionService implements ISessionService {
	/** @ignore */
	private chatData: ChatData;

	/** @ignore */
	private readonly id: string	= util.generateGuid();

	/** @inheritDoc */
	public readonly apiFlags	= {
		forceTURN: false,
		modestBranding: false,
		nativeCrypto: false,
		telehealth: false
	};

	/** @inheritDoc */
	public readonly events: Events			= events;

	/** @inheritDoc */
	public readonly rpcEvents: RpcEvents	= rpcEvents;

	/** @inheritDoc */
	public readonly state	= {
		cyphId: '',
		isAlice: false,
		isAlive: false,
		sharedSecret: '',
		startingNewCyph: false,
		wasInitiatedByAPI: false
	};

	/** @inheritDoc */
	public readonly users: Users	= users;

	/** @inheritDoc */
	public close () : void {
		if (!this.state.isAlive) {
			return;
		}

		this.state.isAlive	= false;

		this.chatData.channelIncoming.complete();
		this.chatData.channelOutgoing.complete();
		this.trigger(events.closeChat);
	}

	/** Initialise service. */
	public async init (chatData: ChatData) : Promise<void> {
		this.chatData		= chatData;
		this.state.isAlice	= this.envService.isMobile;
		this.state.isAlive	= true;

		this.chatData.channelIncoming.subscribe(
			(message: IMessage&{data: {cyphertext: string}}) => {
				if (!message.event) {
					return;
				}

				message.data.author	= this.stringsService.friend;

				if (message.event === events.cyphertext) {
					this.trigger(events.cyphertext, {
						author: message.data.author,
						cyphertext: message.data.cyphertext
					});
				}
				else if (message.event in rpcEvents) {
					this.trigger(message.event, message.data);
				}
			},
			undefined,
			() => { this.close(); }
		);

		await this.chatData.start;

		this.trigger(events.beginChat);
	}

	/** @inheritDoc */
	public off<T> (event: string, handler: (data: T) => void) : void {
		eventManager.off(event + this.id, handler);
	}

	/** @inheritDoc */
	public on<T> (event: string, handler: (data: T) => void) : void {
		eventManager.on(event + this.id, handler);
	}

	/** @inheritDoc */
	public async one<T> (event: string) : Promise<T> {
		return eventManager.one<T>(event + this.id);
	}

	/** @inheritDoc */
	public get proFeatures () : ProFeatures {
		return new ProFeatures();
	}

	/** @inheritDoc */
	public send (...messages: IMessage[]) : void {
		for (const message of messages) {
			const cyphertext	= potassiumUtil.toBase64(
				potassiumUtil.randomBytes(
					util.random(1024, 100)
				)
			);

			this.trigger(events.cyphertext, {
				cyphertext,
				author: users.me
			});

			if (message.event === rpcEvents.text) {
				this.trigger(rpcEvents.text, message.data);
			}

			this.chatData.channelOutgoing.next(new Message(events.cyphertext, {cyphertext}));
			this.chatData.channelOutgoing.next(message);
		}
	}

	/** @inheritDoc */
	public trigger (event: string, data?: any) : void {
		eventManager.trigger(event + this.id, data);
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {}
}
