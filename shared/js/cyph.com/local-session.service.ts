import {Injectable} from '@angular/core';
import {potassium} from '../cyph/crypto/potassium';
import {eventManager} from '../cyph/event-manager';
import {events, rpcEvents, users} from '../cyph/session/enums';
import {IMessage} from '../cyph/session/imessage';
import {Message} from '../cyph/session/message';
import {strings} from '../cyph/strings';
import {EnvService} from '../cyph/ui/services/env.service';
import {util} from '../cyph/util';
import {ChatData} from './chat-data';


/**
 * Mocks session service and communicates locally.
 */
@Injectable()
export class LocalSessionService {
	/** @ignore */
	private chatData: ChatData;

	/** @ignore */
	private readonly id: string	= util.generateGuid();

	/** @inheritDoc */
	public readonly apiFlags	= {
		forceTURN: false,
		modestBranding: false,
		nativeCrypto: false
	};

	/** @inheritDoc */
	public readonly state	= {
		cyphId: '',
		isAlice: false,
		isAlive: false,
		isStartingNewCyph: false,
		sharedSecret: '',
		wasInitiatedByAPI: false
	};

	/** @inheritDoc */
	public async close () : Promise<void> {
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

				message.data.author	= strings.friend;

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
	public async off<T> (event: string, handler: (data: T) => void) : Promise<void> {
		eventManager.off(event + this.id, handler);
	}

	/** @inheritDoc */
	public async on<T> (event: string, handler: (data: T) => void) : Promise<void> {
		eventManager.on(event + this.id, handler);
	}

	/** @inheritDoc */
	public async one<T> (event: string) : Promise<T> {
		return eventManager.one<T>(event + this.id);
	}

	/** @inheritDoc */
	public async send (...messages: IMessage[]) : Promise<void> {
		for (const message of messages) {
			const cyphertext	= potassium.toBase64(
				potassium.randomBytes(
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
	public async sendText (text: string, selfDestructTimeout?: number) : Promise<void> {
		this.send(new Message(rpcEvents.text, {text, selfDestructTimeout}));
	}

	/** @inheritDoc */
	public async trigger (event: string, data?: any) : Promise<void> {
		eventManager.trigger(event + this.id, data);
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {}
}
