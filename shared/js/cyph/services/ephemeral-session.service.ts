import {Injectable} from '@angular/core';
import {analytics} from '../analytics';
import {config} from '../config';
import {AnonymousCastle} from '../crypto/anonymous-castle';
import {env} from '../env';
import {Channel} from '../session/channel';
import {CastleEvents, events, rpcEvents} from '../session/enums';
import {IMessage} from '../session/imessage';
import {ProFeatures} from '../session/profeatures';
import {util} from '../util';
import {ConfigService} from './config.service';
import {SessionInitService} from './session-init.service';
import {SessionService} from './session.service';


/**
 * Manages ephemeral session.
 */
@Injectable()
export class EphemeralSessionService extends SessionService {
	/** @ignore */
	private setId (id: string) : void {
		if (
			/* Too short */
			id.length < config.secretLength ||

			/* Contains invalid character(s) */
			!id.split('').reduce(
				(isValid: boolean, c: string) : boolean =>
					isValid && config.guidAddressSpace.indexOf(c) > -1
				,
				true
			)
		) {
			id	= util.generateGuid(config.secretLength);
		}

		this.state.cyphId		= id.substring(0, config.cyphIdLength);
		this.state.sharedSecret	= this.state.sharedSecret || id;
	}

	/** @ignore */
	private setUpChannel (
		channelDescriptor: string,
		nativeCrypto: boolean,
		remoteUsername: string
	) : void {
		const handlers	= {
			onClose: () => {
				this.state.isAlive	= false;

				/* If aborting before the cyph begins,
					block friend from trying to join */
				util.request({
					method: 'POST',
					url: env.baseUrl + 'channels/' + this.state.cyphId
				}).catch(
					() => {}
				);

				this.trigger(events.closeChat);
			},
			onConnect: () => {
				this.trigger(events.connect);

				this.castle	= new AnonymousCastle(this, nativeCrypto, remoteUsername);
				this.state.sharedSecret	= '';
			},
			onMessage: async (message: string) => {
				(await util.waitForValue(() => this.castle)).receive(message);
			},
			onOpen: async (isAlice: boolean) : Promise<void> => {
				this.state.isAlice	= isAlice;

				if (this.state.isAlice) {
					this.trigger(events.beginWaiting);
				}
				else {
					this.pingPong();

					analytics.sendEvent({
						eventAction: 'started',
						eventCategory: 'cyph',
						eventValue: 1,
						hitType: 'event'
					});

					if (this.state.wasInitiatedByAPI) {
						analytics.sendEvent({
							eventAction: 'started',
							eventCategory: 'api-initiated-cyph',
							eventValue: 1,
							hitType: 'event'
						});
					}
				}

				this.on(events.castle, (e: {event: CastleEvents; data?: any}) =>
					this.castleHandler(e)
				);

				while (this.state.isAlive) {
					await util.sleep();

					if (
						this.sendQueue.length &&
						(
							this.sendQueue.length >= 4 ||
							(util.timestamp() - this.lastOutgoingMessageTimestamp) > 500
						)
					) {
						this.sendHandler(this.sendQueue.splice(0, 4));
					}
				}
			}
		};

		this.channel	= new Channel(channelDescriptor, handlers);
	}

	/** @inheritDoc */
	public close () : void {
		this.channel.close();
	}

	/** @inheritDoc */
	public get proFeatures () : ProFeatures {
		return new ProFeatures(
			this.state.wasInitiatedByAPI,
			this.apiFlags.forceTURN,
			this.apiFlags.modestBranding,
			this.apiFlags.nativeCrypto,
			this.apiFlags.telehealth,
			this.sessionInitService.callType === 'video',
			this.sessionInitService.callType === 'audio'
		);
	}

	/** @inheritDoc */
	public async send (...messages: IMessage[]) : Promise<void> {
		while (!this.castle) {
			await util.sleep();
		}

		for (const message of messages) {
			if (message.event === rpcEvents.text) {
				this.trigger(rpcEvents.text, message.data);
			}
		}

		this.castle.send(
			JSON.stringify(messages, (_, v) => {
				if (v instanceof Uint8Array) {
					(<any> v).isUint8Array	= true;
				}

				return v;
			}),
			util.timestamp()
		);
	}

	constructor (
		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly sessionInitService: SessionInitService
	) {
		super();

		let id	= this.sessionInitService.id;

		/* API flags */
		for (const flag of this.configService.apiFlags) {
			if (id[0] !== flag.character) {
				continue;
			}

			id	= id.substring(1);

			flag.set(this);

			analytics.sendEvent({
				eventAction: 'used',
				eventCategory: flag.analEvent,
				eventValue: 1,
				hitType: 'event'
			});
		}

		this.state.wasInitiatedByAPI	= id.length > this.configService.secretLength;

		/* true = yes; false = no; undefined = maybe */
		this.state.startingNewCyph		=
			this.state.wasInitiatedByAPI ?
				undefined :
				id.length < 1 ?
					true :
					false
		;

		this.setId(id);

		if (this.state.startingNewCyph !== false) {
			this.trigger(events.newCyph);
		}

		const channelDescriptor: string	=
			this.state.startingNewCyph === false ?
				'' :
				util.generateGuid(config.longSecretLength)
		;

		(async () => {
			try {
				this.setUpChannel(
					await util.request({
						data: {channelDescriptor, proFeatures: this.proFeatures},
						method: 'POST',
						retries: 5,
						url: env.baseUrl + 'channels/' + this.state.cyphId
					}),
					this.apiFlags.nativeCrypto,
					await this.remoteUsername
				);
			}
			catch (_) {
				this.trigger(events.cyphNotFound);
			}
		})();
	}
}
