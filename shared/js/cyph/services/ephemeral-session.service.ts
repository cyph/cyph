import {Injectable} from '@angular/core';
import {SessionMessage} from '../../proto';
import {env} from '../env';
import {events} from '../session/enums';
import {ProFeatures} from '../session/profeatures';
import {util} from '../util';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
import {ConfigService} from './config.service';
import {CastleService} from './crypto/castle.service';
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
	private pingPongTimeouts: number	= 0;

	/**
	 * @ignore
	 * Intermittent check to verify chat is still alive and send fake encrypted chatter.
	 */
	private async pingPong () : Promise<void> {
		while (this.state.isAlive) {
			await util.sleep(util.random(90000, 30000));

			if (
				this.lastIncomingMessageTimestamp !== 0 &&
				(await util.timestamp()) - this.lastIncomingMessageTimestamp > 180000 &&
				this.pingPongTimeouts++ < 2
			) {
				this.analyticsService.sendEvent({
					eventAction: 'detected',
					eventCategory: 'ping-pong-timeout',
					eventValue: 1,
					hitType: 'event'
				});
			}

			this.send(new SessionMessage());
		}
	}

	/** @ignore */
	private setID (id: string) : void {
		if (
			/* Too short */
			id.length < this.configService.secretLength ||

			/* Contains invalid character(s) */
			!id.split('').reduce(
				(isValid: boolean, c: string) : boolean =>
					isValid && this.configService.readableIDCharacters.indexOf(c) > -1
				,
				true
			)
		) {
			id	= util.readableID(this.configService.secretLength);
		}

		this.state.cyphID		= id.substring(0, this.configService.cyphIDLength);
		this.state.sharedSecret	= this.state.sharedSecret || id;
	}

	/** @inheritDoc */
	protected async channelOnClose () : Promise<void> {
		super.channelOnClose();

		/* If aborting before the cyph begins, block friend from trying to join */
		util.request({
			method: 'POST',
			url: `${env.baseUrl}channels/${this.state.cyphID}`
		}).catch(
			() => {}
		);
	}

	/** @inheritDoc */
	protected async channelOnOpen (isAlice: boolean) : Promise<void> {
		super.channelOnOpen(isAlice);

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

	constructor (
		analyticsService: AnalyticsService,
		castleService: CastleService,
		channelService: ChannelService,
		errorService: ErrorService,
		potassiumService: PotassiumService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly sessionInitService: SessionInitService
	) {
		super(analyticsService, castleService, channelService, errorService);

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

		this.setID(id);

		const channelID: string	=
			this.state.startingNewCyph === false ?
				'' :
				util.uuid()
		;

		(async () => {
			try {
				this.init(
					potassiumService,
					await util.request({
						data: {channelID, proFeatures: this.proFeatures},
						method: 'POST',
						retries: 5,
						url: `${env.baseUrl}channels/${this.state.cyphID}`
					})
				);
			}
			catch (_) {
				this.trigger(events.cyphNotFound);
			}
		})();
	}
}
