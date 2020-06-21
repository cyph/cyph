import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {env} from '../env';
import {NotificationTypes, StringProto} from '../proto';
import {ProFeatures} from '../session';
import {random} from '../util/random';
import {request} from '../util/request';
import {getTimestamp} from '../util/time';
import {readableID, uuid} from '../util/uuid';
import {sleep} from '../util/wait';
import {AccountService} from './account.service';
import {AnalyticsService} from './analytics.service';
import {ChannelService} from './channel.service';
import {ConfigService} from './config.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {CastleService} from './crypto/castle.service';
import {PotassiumService} from './crypto/potassium.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {ErrorService} from './error.service';
import {LocalStorageService} from './local-storage.service';
import {NotificationService} from './notification.service';
import {SessionInitService} from './session-init.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';

/**
 * Manages ephemeral session.
 */
@Injectable()
export class EphemeralSessionService extends SessionService {
	/** @ignore */
	private readonly chatRequestRingTimeout: number = 15000;

	/** @ignore */
	private readonly localStorageKey = 'BurnerChannelID';

	/** @ignore */
	private pingPongTimeouts: number = 0;

	/**
	 * @ignore
	 * Intermittent check to verify chat is still alive and send fake encrypted chatter.
	 */
	private async pingPong () : Promise<void> {
		while (this.state.isAlive.value) {
			await sleep(random(90000, 30000));

			if (
				this.lastIncomingMessageTimestamp !== 0 &&
				(await getTimestamp()) - this.lastIncomingMessageTimestamp >
					180000 &&
				this.pingPongTimeouts++ < 2
			) {
				this.analyticsService.sendEvent(
					'ping-pong-timeout',
					'detected'
				);
			}

			this.send(['', {}]);
		}
	}

	/** @ignore */
	private setID (
		id: string,
		salt: string | undefined,
		headless: boolean
	) : void {
		if (
			/* Too short */
			id.length < this.configService.secretLength ||
			/* Contains invalid character(s) */
			!id
				.split('')
				.reduce(
					(isValid: boolean, c: string) : boolean =>
						isValid &&
						this.configService.readableIDCharacters.indexOf(c) > -1,
					true
				)
		) {
			id = headless ?
				`${readableID(this.configService.cyphIDLength)}${uuid(
					true,
					false
				)}` :
				readableID(this.configService.secretLength);
		}

		this.state.cyphID.next(
			id.substring(0, this.configService.cyphIDLength)
		);

		this.state.sharedSecret.next(
			(this.state.sharedSecret.value || id) + (salt ? ` ${salt}` : '')
		);
	}

	/** @inheritDoc */
	protected async channelOnClose () : Promise<void> {
		await Promise.all([
			super.channelOnClose(),
			/* If aborting before the cyph begins, block friend from trying to join */
			request({
				method: 'POST',
				url: `${env.baseUrl}channels/${this.state.cyphID.value}`
			}).catch(() => {}),
			this.localStorageService
				.removeItem(
					`${this.localStorageKey}:${this.state.cyphID.value}`
				)
				.catch(() => {})
		]);
	}

	/** @inheritDoc */
	protected async channelOnOpen (isAlice: boolean) : Promise<void> {
		super.channelOnOpen(isAlice);

		if (this.state.isAlice.value) {
			this.beginWaiting.resolve();
			return;
		}

		this.pingPong();

		this.analyticsService.sendEvent('cyph', 'started');

		if (!this.state.wasInitiatedByAPI.value) {
			return;
		}

		this.analyticsService.sendEvent('api-initiated-cyph', 'started');
	}

	/** @inheritDoc */
	public get proFeatures () : ProFeatures {
		return new ProFeatures(
			this.state.wasInitiatedByAPI.value,
			this.apiFlags.disableP2P,
			this.apiFlags.modestBranding,
			this.sessionInitService.callType === 'video',
			this.sessionInitService.callType === 'audio'
		);
	}

	/** @inheritDoc */
	public spawn () : EphemeralSessionService {
		return new EphemeralSessionService(
			this.analyticsService,
			this.castleService.spawn(),
			this.channelService.spawn(),
			this.dialogService,
			this.envService,
			this.errorService,
			this.potassiumService,
			this.sessionInitService.spawn(),
			this.stringsService,
			this.router,
			this.accountService,
			this.accountDatabaseService,
			this.configService,
			this.localStorageService,
			this.notificationService
		);
	}

	constructor (
		analyticsService: AnalyticsService,
		castleService: CastleService,
		channelService: ChannelService,
		dialogService: DialogService,
		envService: EnvService,
		errorService: ErrorService,
		potassiumService: PotassiumService,
		sessionInitService: SessionInitService,
		stringsService: StringsService,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly notificationService: NotificationService
	) {
		super(
			analyticsService,
			castleService,
			channelService,
			dialogService,
			envService,
			errorService,
			potassiumService,
			sessionInitService,
			stringsService
		);

		(async () => {
			this.accountService.autoUpdate.next(false);

			let username: string | undefined;

			let id = await this.sessionInitService.id;
			const salt = await this.sessionInitService.salt;
			const headless = await this.sessionInitService.headless;

			if (id === '404') {
				this.state.startingNewCyph.next(true);
				this.cyphNotFound.resolve();
				return;
			}

			if (id.indexOf('/') > -1) {
				[username, id] = id.split('/');

				if (username && id === 'chat-request') {
					const chatRequestUsername = username;
					this.chatRequestUsername.next(chatRequestUsername);

					id = readableID(this.configService.cyphIDLength);

					(async () => {
						await this.accountDatabaseService.notify(
							chatRequestUsername,
							NotificationTypes.Call,
							{
								callType: 'chat',
								expires:
									(await getTimestamp()) +
									this.chatRequestRingTimeout,
								id
							}
						);

						const answered = await this.notificationService.ring(
							async () =>
								this.channelConnected.promise.then(() => true),
							true,
							undefined,
							this.chatRequestRingTimeout
						);

						if (answered) {
							return;
						}

						if (burnerRoot === '') {
							this.connectFailure.resolve();
							return;
						}

						await this.router.navigate([
							'compose',
							'user',
							chatRequestUsername
						]);

						await this.dialogService.toast(
							this.stringsService.setParameters(
								this.stringsService.chatRequestTimeoutOutgoing,
								{USERNAME: chatRequestUsername}
							),
							-1,
							this.stringsService.ok
						);
					})();
				}
			}

			/* API flags */
			for (const flag of this.configService.apiFlags) {
				if (id[0] !== flag.character) {
					continue;
				}

				id = id.substring(1);
				flag.set(this);

				this.analyticsService.sendEvent(flag.analEvent, 'used');
			}

			if (this.envService.isTelehealth) {
				this.remoteUsername.next(
					this.state.isAlice.value ?
						this.stringsService.patient :
						this.stringsService.doctor
				);
			}

			this.state.wasInitiatedByAPI.next(
				!headless && id.length > this.configService.secretLength
			);

			/* true = yes; false = no; undefined = maybe */
			this.state.startingNewCyph.next(
				this.state.wasInitiatedByAPI.value || username ?
					undefined :
				id.length < 1 ?
					true :
					false
			);

			if (username) {
				this.remoteUsername.next(username);
				this.state.cyphID.next(id);
				this.state.sharedSecret.next(undefined);
			}
			else {
				this.setID(id, salt, headless);
			}

			this.state.ephemeralStateInitialized.next(true);

			const channelID =
				this.state.startingNewCyph.value === false ? '' : uuid(true);

			const getChannelID = async () =>
				request({
					data: {channelID, proFeatures: this.proFeatures},
					method: 'POST',
					retries: 5,
					url: `${env.baseUrl}channels/${this.state.cyphID.value}`
				});

			try {
				await this.prepareForCallType();

				this.init(
					await (this.state.startingNewCyph.value === undefined ?
						this.localStorageService.getOrSetDefault(
							`${this.localStorageKey}:${this.state.cyphID.value}`,
							StringProto,
							getChannelID
						) :
						getChannelID())
				);
			}
			catch {
				this.cyphNotFound.resolve();
			}
		})();
	}
}
