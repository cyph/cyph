import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {take} from 'rxjs/operators';
import {User} from '../account';
import {BooleanProto, CyphPlans, NotificationTypes} from '../proto';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {sleep} from '../util/wait';
import {AccountContactsService} from './account-contacts.service';
import {AccountSessionService} from './account-session.service';
import {AccountService} from './account.service';
import {ChatService} from './chat.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {ConfigService} from './config.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';
import {NotificationService} from './notification.service';
import {P2PWebRTCService} from './p2p-webrtc.service';
import {P2PService} from './p2p.service';
import {SessionCapabilitiesService} from './session-capabilities.service';
import {SessionInitService} from './session-init.service';
import {StringsService} from './strings.service';

/**
 * Angular service for account P2P.
 */
@Injectable()
export class AccountP2PService extends P2PService {
	/** @inheritDoc */
	protected async p2pWarningPersist (
		f: () => Promise<boolean>
	) : Promise<boolean> {
		if (!this.accountDatabaseService.currentUser.value) {
			return f();
		}

		if (
			await this.accountDatabaseService
				.getItem('p2pWarning', BooleanProto)
				.catch(() => false)
		) {
			return true;
		}

		if (await f()) {
			this.accountDatabaseService.setItem(
				'p2pWarning',
				BooleanProto,
				true
			);
			return true;
		}

		return false;
	}

	/** @inheritDoc */
	protected async request (callType: 'audio' | 'video') : Promise<void> {
		const remoteUser = await this.accountSessionService.remoteUser.value;

		if (remoteUser?.anonymous) {
			return super.request(callType);
		}

		const contactID = this.accountSessionService.groupMetadata ?
			this.accountSessionService.groupMetadata.id :
		remoteUser ?
			await remoteUser.contactID :
			undefined;

		if (
			!contactID ||
			!(await this.handlers.requestConfirm(callType, false))
		) {
			return;
		}

		/* Workaround for "Form submission canceled because the form is not connected" warning */
		await sleep(0);

		await this.router.navigate([callType, contactID]);
	}

	/** Initiates call. */
	public async beginCall (
		callType: 'audio' | 'video',
		route: string = callType
	) : Promise<void> {
		const remoteUser = await this.accountSessionService.remoteUser.value;

		if (remoteUser?.anonymous) {
			return;
		}

		const contactID = this.accountSessionService.groupMetadata ?
			Promise.resolve(this.accountSessionService.groupMetadata.id) :
		remoteUser ?
			remoteUser.contactID :
			undefined;

		const usernames = this.accountSessionService.groupMetadata ?
			this.accountSessionService.groupMetadata.usernames :
		remoteUser ?
			[remoteUser.username] :
			undefined;

		if (!contactID || !usernames) {
			return;
		}

		if (
			/* TODO: Apply comparable limitation to group calling */
			remoteUser &&
			!(
				(await this.accountContactsService.isContact(
					remoteUser.username,
					true,
					true
				)) ||
				this.configService.planConfig[
					(await this.accountDatabaseService.currentUser.value?.user.cyphPlan.getValue())
						?.plan || CyphPlans.Free
				].unlimitedCalling ||
				(remoteUser instanceof User &&
					this.configService.planConfig[
						(await remoteUser.cyphPlan.getValue())?.plan ||
							CyphPlans.Free
					].unlimitedCalling)
			)
		) {
			await this.dialogService.alert({
				content: this.stringsService.setParameters(
					this.stringsService.p2pUpgradeToCall,
					{user: remoteUser.username}
				),
				title: this.stringsService.p2pTitle
			});
			return;
		}

		this.accountService.autoUpdate.next(false);
		this.p2pWebRTCService.disconnect
			.pipe(take(1))
			.toPromise()
			.then(() => {
				this.accountService.autoUpdate.next(true);
			});

		const id = uuid();

		await Promise.all([
			getTimestamp().then(async timestamp =>
				Promise.all(
					usernames.map(async username =>
						this.accountDatabaseService.notify(
							username,
							NotificationTypes.Call,
							{
								callType,
								expires:
									timestamp +
									this.notificationService.ringTimeout,
								id
							}
						)
					)
				)
			),
			contactID.then(async contactID =>
				this.router.navigate([route, contactID, id], {
					replaceUrl: true
				})
			)
		]);
	}

	/** @inheritDoc */
	public async init (remoteVideos: () => JQuery) : Promise<void> {
		await this.accountSessionService.ready;

		await super.init(remoteVideos);

		this.subscriptions.push(
			this.isActive.subscribe(isActive => {
				this.accountService.isCallActive.next(isActive);
			})
		);
	}

	constructor (
		chatService: ChatService,
		dialogService: DialogService,
		envService: EnvService,
		localStorageService: LocalStorageService,
		p2pWebRTCService: P2PWebRTCService,
		sessionCapabilitiesService: SessionCapabilitiesService,
		sessionInitService: SessionInitService,
		stringsService: StringsService,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountContactsService: AccountContactsService,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountSessionService: AccountSessionService,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly notificationService: NotificationService
	) {
		super(
			chatService,
			dialogService,
			envService,
			localStorageService,
			p2pWebRTCService,
			sessionCapabilitiesService,
			sessionInitService,
			stringsService
		);
	}
}
