import {Injectable} from '@angular/core';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {env} from '../env';
import {CastleEvents, events, rpcEvents} from '../session/enums';
import {IMessage} from '../session/imessage';
import {ProFeatures} from '../session/profeatures';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
import {ConfigService} from './config.service';
import {AnonymousCastleService} from './crypto/anonymous-castle.service';
import {ErrorService} from './error.service';
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
					url: `${env.baseUrl}channels/${this.state.cyphId}`
				}).catch(
					() => {}
				);

				this.trigger(events.closeChat);
			},
			onConnect: () => {
				this.trigger(events.connect);
			},
			onMessage: (message: string) => {
				this.anonymousCastleService.receive(message);
			},
			onOpen: async (isAlice: boolean) : Promise<void> => {
				this.state.isAlice	= isAlice;

				if (this.state.isAlice) {
					this.trigger(events.beginWaiting);
				}
				else {
					this.pingPong();

					this.analyticsService.sendEvent({
						eventAction: 'started',
						eventCategory: 'cyph',
						eventValue: 1,
						hitType: 'event'
					});

					if (this.state.wasInitiatedByAPI) {
						this.analyticsService.sendEvent({
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
			}
		};

		this.channelService.init(channelDescriptor, handlers);
	}

	/** @ignore */
	protected sendHandler (message: string) : void {
		super.sendHandler(message);
		this.channelService.send(message);
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
		for (const message of messages) {
			if (message.event === rpcEvents.text) {
				this.trigger(rpcEvents.text, message.data);
			}
		}

		this.anonymousCastleService.send(
			JSON.stringify(messages, (_, v) => {
				if (v instanceof Uint8Array) {
					return {
						data: potassiumUtil.toBase64(v),
						isUint8Array: true
					};
				}

				return v;
			}),
			util.timestamp()
		);
	}

	constructor (
		analyticsService: AnalyticsService,

		errorService: ErrorService,

		/** @ignore */
		private readonly anonymousCastleService: AnonymousCastleService,

		/** @ignore */
		private readonly channelService: ChannelService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly sessionInitService: SessionInitService
	) {
		super(analyticsService, errorService);

		let id	= this.sessionInitService.id;

		/* API flags */
		for (const flag of this.configService.apiFlags) {
			if (id[0] === flag.character) {
				id	= id.substring(1);
			}
			else if (!customBuildApiFlags || customBuildApiFlags.indexOf(flag.character) < 0) {
				continue;
			}

			flag.set(this);

			this.analyticsService.sendEvent({
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
						url: `${env.baseUrl}channels/${this.state.cyphId}`
					})
				);
			}
			catch (_) {
				this.trigger(events.cyphNotFound);
			}
		})();
	}
}
