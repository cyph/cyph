import {Injectable} from '@angular/core';
import {env} from '../env';
import {events, rpcEvents} from '../session/enums';
import {IMessage} from '../session/imessage';
import {ProFeatures} from '../session/profeatures';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
import {ConfigService} from './config.service';
import {AnonymousCastleService} from './crypto/anonymous-castle.service';
import {PotassiumService} from './crypto/potassium.service';
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
					isValid && this.configService.readableIdCharacters.indexOf(c) > -1
				,
				true
			)
		) {
			id	= util.readableId(this.configService.secretLength);
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
			onConnect: async () => {
				this.trigger(events.connect);

				while (this.state.isAlive) {
					await util.sleep(this.plaintextSendInterval);

					if (this.plaintextSendQueue.length < 1) {
						continue;
					}

					this.anonymousCastleService.send(
						await util.toBytes(
							this.plaintextSendQueue.splice(0, this.plaintextSendQueue.length)
						)
					);
				}
			},
			onMessage: (message: Uint8Array) => {
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
			}
		};

		this.channelService.init(channelDescriptor, handlers);
	}

	/** @ignore */
	protected cyphertextSendHandler (message: Uint8Array) : void {
		super.cyphertextSendHandler(message);
		this.channelService.send(message);
	}

	/** @inheritDoc */
	public close () : void {
		this.channelService.close();
	}

	/** @inheritDoc */
	public async lock<T> (f: (reason?: string) => Promise<T>, reason?: string) : Promise<T> {
		const potassiumService	= await this.potassiumService;

		return this.channelService.lock(
			async r => f(!r ?
				undefined :
				potassiumService.toString(
					await potassiumService.secretBox.open(
						potassiumService.fromBase64(r),
						await this.symmetricKey
					)
				)
			),
			!reason ?
				undefined :
				potassiumService.toBase64(
					await potassiumService.secretBox.seal(
						potassiumService.fromString(reason),
						await this.symmetricKey
					)
				)
		);
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
		this.plaintextSendHandler(messages);

		for (const message of messages) {
			if (message.event === rpcEvents.text) {
				this.trigger(rpcEvents.text, message.data);
			}
		}
	}

	constructor (
		analyticsService: AnalyticsService,

		errorService: ErrorService,

		potassiumService: PotassiumService,

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

		this.init(potassiumService);

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
				util.uuid()
		;

		(async () => {
			this.anonymousCastleService.init(await this.potassiumService, this);
		})();

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
