/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {env} from '../env';
import {
	BurnerGroup,
	IBurnerGroup,
	IBurnerGroupMember,
	NotificationTypes,
	StringProto
} from '../proto';
import {ProFeatures, RpcEvents} from '../session';
import {getOrSetDefault} from '../util/get-or-set-default';
import {random} from '../util/random';
import {request} from '../util/request';
import {deserialize, serialize} from '../util/serialization';
import {getTimestamp} from '../util/time';
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
import {LocalStorageService} from './local-storage.service';
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
	private readonly chatRequestRingTimeoutGracePeriod: number = 30000;

	/** @ignore */
	private readonly localStorageKey = 'BurnerChannelID';

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

				const id = `${readableID(
					this.configService.cyphIDLength
				)}${uuid(true, false)}`;

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
							id: readableID(this.configService.secretLength),
							isHost: true
						},
						...Array.from(fullBurnerGroup.get(o)?.values() || [])
					]
				}
			])
		);
	}

	/** @ignore */
	private async initGroup (groupMemberNames: string[]) : Promise<void> {
		const parentID = await this.sessionInitService.id;

		const members: IBurnerGroupMember[] = groupMemberNames.map(name => ({
			id: readableID(this.configService.secretLength),
			name
		}));

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
			masterSessionInit.child = true;
			masterSessionInit.parentID = parentID;
			masterSessionInit.setID(member.id, undefined, true);

			const masterSession = this.spawn(masterSessionInit);

			const childSessionInit = new BasicSessionInitService();
			childSessionInit.callType = this.sessionInitService.callType;
			childSessionInit.child = true;
			childSessionInit.parentID = parentID;
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

		this.setIDs(
			sessionServices.map(o => o.member.id),
			undefined,
			true
		);

		this.state.ephemeralStateInitialized.next(true);

		await Promise.all<unknown>([
			this.channelOnOpen(true).then(async () => {
				this.channelService.initialMessagesProcessed.resolve();
				await Promise.race(
					sessionServices.map(
						async o => o.masterSession.channelConnected
					)
				);
				await this.channelOnConnect();
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
	private setIDs (
		ids: string[],
		salt: string | undefined,
		headless: boolean
	) : void {
		const cyphIDs: string[] = [];
		const sharedSecrets: string[] = [];

		for (let i = 0; i < ids.length; ++i) {
			let id = ids[i];
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
					`${readableID(this.configService.cyphIDLength)}${uuid(
						true,
						false
					)}` :
					readableID(this.configService.secretLength);
			}

			cyphIDs.push(id.substring(0, this.configService.cyphIDLength));

			sharedSecrets.push(
				(oldSharedSecret !== undefined ? oldSharedSecret : id) +
					(salt ? ` ${salt}` : '')
			);
		}

		this.state.cyphIDs.next(cyphIDs);
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
						method: 'POST',
						url: `${env.baseUrl}channels/${this.cyphID}`
					}).catch(() => {}),
					this.localStorageService
						.removeItem(`${this.localStorageKey}:${this.cyphID}`)
						.catch(() => {})
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
			this.sessionInitService.child &&
			!(await this.sessionInitService.headless)
		) {
			this.pingPong();
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
			this.localStorageService,
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
		private readonly localStorageService: LocalStorageService,

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

			let username: string | undefined;

			const fullID = await this.sessionInitService.id;
			let id = fullID;
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
				this.sessionInitService.child ||
					this.state.wasInitiatedByAPI.value ||
					username ?
					undefined :
				id.length < 1 ?
					true :
					false
			);

			const isAliceRoot =
				this.state.startingNewCyph.value &&
				!this.sessionInitService.child;

			if (isAliceRoot && this.sessionInitService.ephemeralGroupsAllowed) {
				const groupMemberNames = await this.sessionInitService
					.ephemeralGroupMemberNames;

				if (groupMemberNames.length > 0) {
					await this.initGroup(groupMemberNames);
					return;
				}
			}

			if (username) {
				this.remoteUsername.next(username);
				this.state.cyphIDs.next([id]);
				this.state.sharedSecrets.next([]);
			}
			else {
				this.setIDs([id], salt, headless);
			}

			this.state.ephemeralStateInitialized.next(true);

			const maybeChannelID =
				this.state.startingNewCyph.value === false ? '' : uuid(true);

			const getChannelID = async () =>
				request({
					data: {
						channelID: maybeChannelID,
						proFeatures: this.proFeatures
					},
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

				channelID = await (this.state.startingNewCyph.value ===
				undefined ?
					this.localStorageService.getOrSetDefault(
						`${this.localStorageKey}:${this.cyphID}`,
						StringProto,
						getChannelID
					) :
					getChannelID());
			}
			catch {}

			if (channelID === undefined) {
				this.cyphNotFound.resolve();
				return;
			}

			await this.init(channelID);

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
					sessionInit.callType = this.sessionInitService.callType;
					sessionInit.child = true;
					sessionInit.parentID = fullID;
					sessionInit.setID(member.id);

					if (i === 0) {
						const castleService = new BasicCastleService(
							this.accountDatabaseService,
							this.potassiumService
						);

						const hostSession = this.spawn(
							sessionInit,
							castleService
						);

						castleService
							.setKey(this.getSymmetricKey())
							.then(async () => castleService.init(hostSession))
							.catch(() => {});

						return hostSession;
					}

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
