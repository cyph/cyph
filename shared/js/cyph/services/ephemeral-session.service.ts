/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {env} from '../env';
import {
	BurnerGroup,
	IBurnerGroup,
	IBurnerGroupMember,
	IBurnerGroupMemberInitiator,
	NotificationTypes
} from '../proto';
import {ProFeatures, RpcEvents} from '../session';
import {getOrSetDefault} from '../util/get-or-set-default';
import {debugLog} from '../util/log';
import {random} from '../util/random';
import {request} from '../util/request';
import {deserialize, serialize} from '../util/serialization';
import {getDate, getISODateString, getTimestamp} from '../util/time';
import {readableID, uuid} from '../util/uuid';
import {sleep} from '../util/wait';
import {AccountService} from './account.service';
import {AnalyticsService} from './analytics.service';
import {BasicSessionInitService} from './basic-session-init.service';
import {ChannelService} from './channel.service';
import {ConfigService} from './config.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {BasicCastleService} from './crypto/basic-castle.service';
import {CastleService} from './crypto/castle.service';
import {PotassiumService} from './crypto/potassium.service';
import {DatabaseService} from './database.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {ErrorService} from './error.service';
import {NotificationService} from './notification.service';
import {SessionInitService} from './session-init.service';
import {SessionWrapperService} from './session-wrapper.service';
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
	private readonly chatRequestRingTimeoutGracePeriod: number = 60000;

	/** @ignore */
	private pingPongTimeouts: number = 0;

	/** @ignore */
	private createBurnerGroups (
		members: IBurnerGroupMember[]
	) : Map<IBurnerGroupMember, IBurnerGroup> {
		const fullBurnerGroup = new Map<
			IBurnerGroupMember,
			Map<IBurnerGroupMember, IBurnerGroupMember>
		>();

		for (const alice of members) {
			for (const bob of members) {
				if (alice === bob || fullBurnerGroup.get(alice)?.has(bob)) {
					continue;
				}

				const aliceGroup = getOrSetDefault(
					fullBurnerGroup,
					alice,
					() => new Map<IBurnerGroupMember, IBurnerGroupMember>()
				);

				const bobGroup = getOrSetDefault(
					fullBurnerGroup,
					bob,
					() => new Map<IBurnerGroupMember, IBurnerGroupMember>()
				);

				const id = uuid(true) + uuid(true);

				aliceGroup.set(bob, {
					id,
					name: bob.name
				});

				bobGroup.set(alice, {
					id,
					name: alice.name
				});
			}
		}

		return new Map<IBurnerGroupMember, IBurnerGroup>(
			members.map(o => [
				o,
				{
					members: [
						{
							id:
								uuid(true) +
								(this.sessionInitService
									.accountsBurnerAliceData ?
									'' :
									uuid(true)),
							isHost: true
						},
						...Array.from(fullBurnerGroup.get(o)?.values() || [])
					]
				}
			])
		);
	}

	/** @ignore */
	private async initGroup (
		groupMembers: IBurnerGroupMemberInitiator[]
	) : Promise<void> {
		const parentID = await this.sessionInitService.id;

		const members: IBurnerGroupMember[] = groupMembers.map(
			({id, name}) => ({
				id: id === undefined ? uuid(true) + uuid(true) : id,
				name
			})
		);

		const burnerGroups = this.createBurnerGroups(members);

		const sessionServices = members.map((member, i) => {
			const burnerGroup = burnerGroups.get(member);

			if (
				!burnerGroup ||
				!burnerGroup.members ||
				burnerGroup.members.length < 1
			) {
				throw new Error('Burner group init failure.');
			}

			const masterSessionInit = new BasicSessionInitService();
			masterSessionInit.accountsBurnerAliceData = this.sessionInitService.accountsBurnerAliceData;
			masterSessionInit.child = true;
			masterSessionInit.parentID = parentID;
			masterSessionInit.timeString = this.sessionInitService.timeString;
			masterSessionInit.setID(member.id, undefined, true);

			const masterSession = this.spawn(masterSessionInit);

			const childSessionInit = new BasicSessionInitService();
			childSessionInit.accountsBurnerAliceData = this.sessionInitService.accountsBurnerAliceData;
			childSessionInit.child = true;
			childSessionInit.parentID = parentID;
			childSessionInit.timeString = this.sessionInitService.timeString;
			childSessionInit.setID(burnerGroup.members[0].id);

			const childCastleService = new BasicCastleService(
				this.accountDatabaseService,
				this.potassiumService
			);

			const childSession = this.spawn(
				childSessionInit,
				childCastleService
			);

			childSession.remoteUsername.next(
				member.name ||
					this.stringsService.setParameters(
						this.stringsService.burnerGroupDefaultMemberName,
						{i: (i + 1).toString()}
					)
			);

			const childSessionHandshake = childCastleService.setKey(
				masterSession.getSymmetricKey()
			);

			return {
				burnerGroup,
				childSession,
				childSessionHandshake,
				masterSession,
				member
			};
		});

		this.setGroup(sessionServices.map(o => o.childSession));

		await this.setIDs(
			sessionServices.map(o => o.member.id),
			undefined,
			true
		);

		this.channelService.initialMessagesProcessed.resolve();
		this.state.ephemeralStateInitialized.next(true);
		this.state.isAlice.next(true);

		await Promise.all<unknown>([
			this.opened.then(async () => this.channelOnOpen(true)),
			this.connected.then(() => {
				this.state.isConnected.next(true);
			}),
			Promise.race(
				sessionServices.map(async o => o.masterSession.connected)
			).then(async () => {
				const castleService = new BasicCastleService(
					this.accountDatabaseService,
					this.potassiumService
				);

				await castleService.setKey(
					new Uint8Array(
						await this.potassiumService.secretBox.keyBytes
					)
				);
				await castleService.init(this);

				await this.castleService.setPairwiseSession(castleService);
			}),
			...sessionServices.map(async o =>
				Promise.all([
					serialize(BurnerGroup, o.burnerGroup).then(async bytes =>
						o.masterSession.send([
							RpcEvents.burnerGroup,
							{
								bytes
							}
						])
					),
					o.childSessionHandshake
				])
			)
		]);
	}

	/** @ignore */
	private async getIDPrefix () : Promise<string | undefined> {
		const timeString = this.sessionInitService.timeString;

		if (!timeString) {
			return;
		}

		const bytes = this.potassiumService.fromHex(timeString);

		if (bytes.length !== 2) {
			return;
		}

		const utcHours = bytes[0];
		const utcMinutes = bytes[1];
		const utcTime = utcHours * 60 + utcMinutes;

		const now = await getDate();
		const currentUTCHours = now.getUTCHours();
		const currentUTCMinutes = now.getUTCMinutes();
		const currentUTCTime = currentUTCHours * 60 + currentUTCMinutes;

		const dayDelta =
			12 * 60 > Math.abs(currentUTCTime - utcTime) ?
				0 :
			utcTime > currentUTCTime ?
				-1 :
				1;

		return `${timeString}_${getISODateString(
			now.setDate(now.getDate() + dayDelta)
		)}`;
	}

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
	private async setIDs (
		ids: string[],
		salt: string | undefined,
		headless: boolean
	) : Promise<void> {
		const cyphIDs: string[] = [];
		const sharedSecrets: string[] = [];

		for (let i = 0; i < ids.length; ++i) {
			let id = ids[i];

			if (
				this.sessionInitService.accountsBurnerAliceData &&
				id.length > 0
			) {
				cyphIDs.push(id);
				sharedSecrets.push(
					`${this.sessionInitService.accountsBurnerAliceData.username}/${id}`
				);
				continue;
			}

			const oldSharedSecret =
				this.state.sharedSecrets.value.length > i ?
					this.state.sharedSecrets.value[i] :
					undefined;

			if (
				/* Too short */
				id.length < this.configService.secretLength ||
				/* Contains invalid character(s) */
				!id
					.split('')
					.reduce(
						(isValid: boolean, c: string) : boolean =>
							isValid &&
							this.configService.readableIDCharacters.indexOf(c) >
								-1,
						true
					)
			) {
				id = headless ?
					uuid(true) + uuid(true) :
					readableID(this.configService.secretLength);
			}

			cyphIDs.push(
				id.substring(
					0,
					id.length > this.configService.secretLength ?
						Math.floor(id.length / 2) :
						this.configService.cyphIDLength
				)
			);

			sharedSecrets.push(
				(oldSharedSecret !== undefined ? oldSharedSecret : id) +
					(salt ? ` ${salt}` : '')
			);
		}

		const idPrefix = await this.getIDPrefix();

		this.state.cyphIDs.next(
			idPrefix ? cyphIDs.map(id => `${idPrefix}_${id}`) : cyphIDs
		);
		this.state.sharedSecrets.next(sharedSecrets);
	}

	/** @inheritDoc */
	protected async channelOnClose () : Promise<void> {
		if (this.group && this.group.length > 1) {
			return;
		}

		await Promise.all([
			super.channelOnClose(),
			/* If aborting before the cyph begins, block friend from trying to join */
			...(this.cyphID ?
				[
					request({
						method: 'DELETE',
						retries: 5,
						url: `${env.baseUrl}channels/${this.cyphID}`
					}).catch(() => {})
				] :
				[])
		]);
	}

	/** @inheritDoc */
	protected async channelOnOpen (isAlice: boolean) : Promise<void> {
		super.channelOnOpen(isAlice);

		if (this.state.isAlice.value) {
			this.beginWaiting.resolve();
			return;
		}

		if (
			!this.group &&
			!this.sessionInitService.child &&
			!(await this.sessionInitService.headless)
		) {
			this.pingPong();
		}

		if (this.sessionInitService.child) {
			return;
		}

		this.analyticsService.sendEvent('cyph', 'started');

		if (!this.state.wasInitiatedByAPI.value) {
			return;
		}

		this.analyticsService.sendEvent('api-initiated-cyph', 'started');
	}

	/** @inheritDoc */
	public get proFeatures () : ProFeatures {
		return new ProFeatures(
			this.apiFlags.disableP2P,
			this.apiFlags.modestBranding,
			this.sessionInitService.callType === 'video',
			this.sessionInitService.callType === 'audio'
		);
	}

	/** @inheritDoc */
	public spawn (
		sessionInitService: SessionInitService = this.sessionInitService.spawn(),
		castleService: CastleService = this.castleService.spawn()
	) : EphemeralSessionService {
		return new EphemeralSessionService(
			this.analyticsService,
			castleService,
			this.channelService.spawn(),
			this.databaseService,
			this.dialogService,
			this.envService,
			this.errorService,
			this.potassiumService,
			sessionInitService,
			this.sessionWrapperService.spawn(),
			this.stringsService,
			this.router,
			this.accountService,
			this.accountDatabaseService,
			this.configService,
			this.notificationService
		);
	}

	constructor (
		analyticsService: AnalyticsService,
		castleService: CastleService,
		channelService: ChannelService,
		databaseService: DatabaseService,
		dialogService: DialogService,
		envService: EnvService,
		errorService: ErrorService,
		potassiumService: PotassiumService,
		sessionInitService: SessionInitService,
		sessionWrapperService: SessionWrapperService,
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
		private readonly notificationService: NotificationService
	) {
		super(
			analyticsService,
			castleService,
			channelService,
			databaseService,
			dialogService,
			envService,
			errorService,
			potassiumService,
			sessionInitService,
			sessionWrapperService,
			stringsService
		);

		/* eslint-disable-next-line complexity */
		(async () => {
			this.accountService.autoUpdate.next(false);

			if (this.sessionInitService.accountsBurnerAliceData?.remoteUser) {
				this.remoteUser.resolve(
					this.sessionInitService.accountsBurnerAliceData.remoteUser
				);
			}

			let username: string | undefined;

			const fullID = await this.sessionInitService.id;
			let id = fullID;
			const salt = await this.sessionInitService.salt;
			const headless = await this.sessionInitService.headless;
			const joinConfirmation = await this.sessionInitService
				.joinConfirmation;

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

					id = uuid(true);

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
							async () => this.channelConnected.then(() => true),
							true,
							undefined,
							this.chatRequestRingTimeout +
								this.chatRequestRingTimeoutGracePeriod
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

			/* Force TURN for all scheduled meetings */
			if (this.sessionInitService.timeString) {
				this.apiFlags.disableP2P = true;
			}

			if (this.envService.isTelehealth) {
				this.remoteUsername.next(
					this.state.isAlice.value ?
						this.stringsService.patient :
						this.stringsService.doctor
				);
			}

			this.state.wasInitiatedByAPI.next(
				!this.sessionInitService.accountsBurnerAliceData &&
					!headless &&
					id.length > this.configService.secretLength
			);

			/* true = yes; false = no; undefined = maybe */
			this.state.startingNewCyph.next(
				this.sessionInitService.accountsBurnerAliceData?.passive ===
					true ?
					undefined :
				this.sessionInitService.accountsBurnerAliceData?.passive ===
				false ?
					true :
				this.sessionInitService.child ||
				this.state.wasInitiatedByAPI.value ||
				username ?
					undefined :
				id.length < 1 ?
					true :
					false
			);

			if (
				joinConfirmation &&
				this.state.startingNewCyph.value !== true &&
				!(await this.dialogService.confirm({
					content: this.stringsService.sessionJoinConfirmContent,
					title: this.stringsService.sessionJoinDialogTitle
				}))
			) {
				await this.router.navigate([burnerRoot, '404']);
				await this.dialogService.alert({
					content: this.stringsService.sessionJoinRejectContent,
					title: this.stringsService.sessionJoinDialogTitle
				});
				return;
			}

			const isAliceRoot =
				(!!this.sessionInitService.accountsBurnerAliceData ||
					this.state.startingNewCyph.value === true) &&
				!this.sessionInitService.child;

			if (isAliceRoot && this.sessionInitService.ephemeralGroupsAllowed) {
				const groupMembers = await this.sessionInitService
					.ephemeralGroupMembers;

				if (groupMembers.length > 0) {
					await this.initGroup(groupMembers);
					return;
				}
			}

			if (username) {
				const idPrefix = await this.getIDPrefix();

				this.remoteUsername.next(username);
				this.state.cyphIDs.next([idPrefix ? `${idPrefix}_${id}` : id]);
				this.state.sharedSecrets.next([]);
			}
			else {
				await this.setIDs([id], salt, headless);
			}

			this.state.ephemeralStateInitialized.next(true);

			const maybeChannelID =
				this.state.startingNewCyph.value === false ? '' : uuid(true);

			const getChannelIDRequestDebug = {tries: 0};

			const getChannelID = async () =>
				request({
					data: {
						channelID: maybeChannelID,
						proFeatures: this.proFeatures
					},
					debug: getChannelIDRequestDebug,
					method: 'POST',
					retries: 5,
					url: `${env.baseUrl}channels/${this.cyphID}`
				});

			let channelID: string | undefined;

			try {
				if (!this.cyphID) {
					throw new Error('No session ID.');
				}

				await this.prepareForCallType();

				channelID = await getChannelID();
			}
			catch {}

			debugLog(() => ({
				ephemeralSessionInit: {
					channelID,
					cyphID: this.cyphID,
					getChannelIDRequestTries: getChannelIDRequestDebug.tries,
					maybeChannelID,
					startingNewCyph: this.state.startingNewCyph.value
				}
			}));

			if (channelID === undefined) {
				this.cyphNotFound.resolve();
				return;
			}

			await this.init(channelID);

			this.connected
				.then(async () =>
					request({
						method: 'DELETE',
						retries: 5,
						url: `${env.baseUrl}channels/${this.cyphID}`
					})
				)
				.catch(() => {});

			if (
				isAliceRoot ||
				!this.sessionInitService.ephemeralGroupsAllowed ||
				this.sessionInitService.child
			) {
				this.childChannelsConnected.resolve();

				if (isAliceRoot) {
					await this.send([RpcEvents.burnerGroup, {}]);
				}

				return;
			}

			let burnerGroup: IBurnerGroup | undefined;

			try {
				burnerGroup = await deserialize(
					BurnerGroup,
					(await this.one(RpcEvents.burnerGroup))[0]?.bytes ||
						new Uint8Array(0)
				);
			}
			catch {}

			if (
				!burnerGroup ||
				!burnerGroup.members ||
				burnerGroup.members.length < 1
			) {
				this.childChannelsConnected.resolve();
				return;
			}

			this.setGroup(
				burnerGroup.members.map((member, i) => {
					const sessionInit = new BasicSessionInitService();
					sessionInit.accountsBurnerAliceData = this.sessionInitService.accountsBurnerAliceData;
					sessionInit.child = true;
					sessionInit.parentID = fullID;
					sessionInit.timeString = this.sessionInitService.timeString;

					if (i === 0) {
						sessionInit.setID(
							username ? `${username}/${member.id}` : member.id
						);

						const castleService = new BasicCastleService(
							this.accountDatabaseService,
							this.potassiumService
						);

						const hostSession = this.spawn(
							sessionInit,
							castleService
						);

						hostSession.remoteUsername.next(
							username ||
								this.stringsService.burnerGroupDefaultHostName
						);

						castleService
							.setKey(this.getSymmetricKey())
							.then(async () => castleService.init(hostSession))
							.catch(() => {});

						return hostSession;
					}

					sessionInit.setID(member.id);

					const session = this.spawn(sessionInit);

					session.remoteUsername.next(
						member.name ||
							this.stringsService.setParameters(
								this.stringsService
									.burnerGroupDefaultMemberName,
								{i: i.toString()}
							)
					);

					return session;
				})
			);
		})();
	}
}
