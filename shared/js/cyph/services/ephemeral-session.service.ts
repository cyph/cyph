import {Injectable} from '@angular/core';
import {analytics} from '../analytics';
import {AnonymousCastle} from '../crypto/anonymous-castle';
import {env} from '../env';
import {CastleEvents, events, rpcEvents} from '../session/enums';
import {IMessage} from '../session/imessage';
import {ProFeatures} from '../session/profeatures';
import {util} from '../util';
import {ChannelService} from './channel.service';
import {ConfigService} from './config.service';
import {SessionInitService} from './session-init.service';
import {SessionService} from './session.service';


/**
 * Manages ephemeral session.
 */
@Injectable()
export class EphemeralSessionService extends SessionService {
	/** @ignore */
	private sendHandler (messages: string[]) : void {
		this.lastOutgoingMessageTimestamp	= util.timestamp();

		for (const message of messages) {
			this.channelService.send(message);
		}

		analytics.sendEvent({
			eventAction: 'sent',
			eventCategory: 'message',
			eventValue: messages.length,
			hitType: 'event'
		});
	}

	/** @ignore */
	private setId (id: string) : void {
		if (
			/* Too short */
			id.length < this.configService.secretLength ||

			/* Contains invalid character(s) */
			!id.split('').reduce(
				(isValid: boolean, c: string) : boolean =>
					isValid && this.configService.guidAddressSpace.indexOf(c) > -1
				,
				true
			)
		) {
			id	= util.generateGuid(this.configService.secretLength);
		}

		this.state.cyphId		= id.substring(0, this.configService.cyphIdLength);
		this.state.sharedSecret	= this.state.sharedSecret || id;
	}

	/** @ignore */
	private setUpChannel (channelDescriptor: string) : void {
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
			onConnect: async () => {
				this.trigger(events.connect);

				this.castle	= new AnonymousCastle(
					this,
					this.apiFlags.nativeCrypto,
					await this.remoteUsername
				);

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

				this.on(events.castle, (e: {data?: any; event: CastleEvents}) => {
					this.castleHandler(e);
				});

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

		this.channelService.init(channelDescriptor, handlers);
	}

	/** @inheritDoc */
	public close () : void {
		this.channelService.close();
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
		private readonly channelService: ChannelService,

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
				util.generateGuid(this.configService.longSecretLength)
		;

		(async () => {
			try {
				this.setUpChannel(
					await util.request({
						data: {channelDescriptor, proFeatures: this.proFeatures},
						method: 'POST',
						retries: 5,
						url: env.baseUrl + 'channels/' + this.state.cyphId
					})
				);
			}
			catch (_) {
				this.trigger(events.cyphNotFound);
			}
		})();
	}
}
