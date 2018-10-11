import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {NotificationTypes} from '../proto';
import {getTimestamp} from '../util/time';
import {uuid} from '../util/uuid';
import {sleep} from '../util/wait';
import {AccountSessionService} from './account-session.service';
import {ChatService} from './chat.service';
import {AccountDatabaseService} from './crypto/account-database.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
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
	/** Max ring time. */
	public readonly ringTimeout: number	= 60000;

	/** @ignore */
	protected async request (callType: 'audio'|'video') : Promise<void> {
		if (
			!this.accountSessionService.remoteUser.value ||
			!(await this.handlers.requestConfirm(callType, false))
		) {
			return;
		}

		/* Workaround for "Form submission canceled because the form is not connected" warning */
		await sleep(0);

		await this.router.navigate([
			accountRoot,
			callType,
			await this.accountSessionService.remoteUser.value.contactID
		]);
	}

	/** Initiates call. */
	public async beginCall (callType: 'audio'|'video', route: string = callType) : Promise<void> {
		if (!this.accountSessionService.remoteUser.value) {
			return;
		}

		const id		= uuid();
		const username	= this.accountSessionService.remoteUser.value.username;

		await Promise.all([
			getTimestamp().then(async timestamp =>
				this.accountDatabaseService.notify(
					username,
					NotificationTypes.Call,
					{callType, expires: timestamp + this.ringTimeout, id}
				)
			),
			this.accountSessionService.remoteUser.value.contactID.then(async contactID =>
				this.router.navigate([accountRoot, route, contactID, id])
			)
		]);
	}

	/** @inheritDoc */
	public async closeButton (cancelRedirectsHome: boolean = false) : Promise<void> {
		const [contactID]	= await Promise.all([
			this.accountSessionService.remoteUser.value ?
				this.accountSessionService.remoteUser.value.contactID :
				Promise.resolve(undefined)
			,
			super.closeButton()
		]);

		if (!contactID) {
			return;
		}

		if (cancelRedirectsHome) {
			await this.router.navigate([accountRoot]);
		}
		else {
			await this.router.navigate([accountRoot, 'messages', contactID]);
		}
	}

	/** Gets URL to answer call. */
	public getCallURL (callType: 'audio'|'video', contactID: string, id: string) : string[] {
		return [accountRoot, callType, contactID, id, 'answer'];
	}

	/** @inheritDoc */
	public async init (localVideo: () => JQuery, remoteVideo: () => JQuery) : Promise<void> {
		await super.init(localVideo, remoteVideo);

		if (this.accountSessionService.group) {
			this.isEnabled.next(false);
		}
	}

	constructor (
		chatService: ChatService,
		dialogService: DialogService,
		envService: EnvService,
		p2pWebRTCService: P2PWebRTCService,
		sessionCapabilitiesService: SessionCapabilitiesService,
		sessionInitService: SessionInitService,
		stringsService: StringsService,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountSessionService: AccountSessionService
	) {
		super(
			chatService,
			dialogService,
			envService,
			p2pWebRTCService,
			sessionCapabilitiesService,
			sessionInitService,
			stringsService
		);
	}
}
