import {Injectable} from '@angular/core';
import {env} from '../env';
import {events, ProFeatures} from '../session';
import {random} from '../util/random';
import {request} from '../util/request';
import {getTimestamp} from '../util/time';
import {readableID, uuid} from '../util/uuid';
import {sleep} from '../util/wait';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
import {ConfigService} from './config.service';
import {CastleService} from './crypto/castle.service';
import {PotassiumService} from './crypto/potassium.service';
import {EnvService} from './env.service';
import {ErrorService} from './error.service';
import {SessionInitService} from './session-init.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';


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
			await sleep(random(90000, 30000));

			if (
				this.lastIncomingMessageTimestamp !== 0 &&
				(await getTimestamp()) - this.lastIncomingMessageTimestamp > 180000 &&
				this.pingPongTimeouts++ < 2
			) {
				this.analyticsService.sendEvent({
					eventAction: 'detected',
					eventCategory: 'ping-pong-timeout',
					eventValue: 1,
					hitType: 'event'
				});
			}

			this.send(['', {}]);
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
			id	= readableID(this.configService.secretLength);
		}

		this.state.cyphID		= id.substring(0, this.configService.cyphIDLength);
		this.state.sharedSecret	= this.state.sharedSecret || id;
	}

	/** @inheritDoc */
	protected async channelOnClose () : Promise<void> {
		super.channelOnClose();

		/* If aborting before the cyph begins, block friend from trying to join */
		request({
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
			this.apiFlags.disableP2P,
			this.apiFlags.modestBranding,
			this.sessionInitService.callType === 'video',
			this.sessionInitService.callType === 'audio'
		);
	}

	constructor (
		analyticsService: AnalyticsService,
		castleService: CastleService,
		channelService: ChannelService,
		envService: EnvService,
		errorService: ErrorService,
		potassiumService: PotassiumService,
		sessionInitService: SessionInitService,
		stringsService: StringsService,

		/** @ignore */
		private readonly configService: ConfigService
	) {
		super(
			analyticsService,
			castleService,
			channelService,
			envService,
			errorService,
			potassiumService,
			sessionInitService,
			stringsService
		);

		let id	= this.sessionInitService.id;

		/* API flags */
		for (const flag of this.configService.apiFlags) {
			if (id[0] !== flag.character) {
				continue;
			}

			id	= id.substring(1);
			flag.set(this);

			this.analyticsService.sendEvent({
				eventAction: 'used',
				eventCategory: flag.analEvent,
				eventValue: 1,
				hitType: 'event'
			});
		}

		if (this.envService.isTelehealth) {
			this.remoteUsername.next(this.state.isAlice ?
				this.stringsService.patient :
				this.stringsService.doctor
			);
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
				uuid()
		;

		(async () => {
			try {
				this.init(
					await request({
						data: {channelID, proFeatures: this.proFeatures},
						method: 'POST',
						retries: 5,
						url: `${env.baseUrl}channels/${this.state.cyphID}`
					})
				);
			}
			catch {
				this.trigger(events.cyphNotFound);
			}
		})();
	}
}
