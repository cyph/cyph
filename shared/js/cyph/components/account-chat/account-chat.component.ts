import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router, UrlSegment} from '@angular/router';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {take} from 'rxjs/operators/take';
import {UserPresence} from '../../account/enums';
import {UiStyles} from '../../chat/enums';
import {ChatMessageValueTypes} from '../../proto';
import {accountChatProviders} from '../../providers';
import {AccountChatService} from '../../services/account-chat.service';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountSessionService} from '../../services/account-session.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {EnvService} from '../../services/env.service';
import {P2PWebRTCService} from '../../services/p2p-webrtc.service';
import {P2PService} from '../../services/p2p.service';
import {StringsService} from '../../services/strings.service';
import {sleep} from '../../util/wait';


/**
 * Angular component for account chat UI.
 */
@Component({
	providers: accountChatProviders,
	selector: 'cyph-account-chat',
	styleUrls: ['./account-chat.component.scss'],
	templateUrl: './account-chat.component.html'
})
export class AccountChatComponent implements OnDestroy, OnInit {
	/** @ignore */
	private destroyed: boolean	= false;

	/** @ignore */
	private initiated: boolean	= false;

	/** @see ChatMessageValueTypes */
	public readonly chatMessageValueTypes: typeof ChatMessageValueTypes	= ChatMessageValueTypes;

	/** @see ChatMessageValueTypes */
	public messageType: BehaviorSubject<ChatMessageValueTypes>			= new BehaviorSubject(
		ChatMessageValueTypes.Text
	);

	/** @see UiStyles */
	public readonly uiStyles: typeof UiStyles							= UiStyles;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence					= UserPresence;

	/** @inheritDoc */
	public async ngOnDestroy () : Promise<void> {
		this.destroyed	= true;

		if (this.p2pWebRTCService.isActive) {
			await this.p2pWebRTCService.close();
		}

		await this.accountSessionService.destroy();
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.accountService.transitionEnd();

		if (this.envService.isTelehealth) {
			this.messageType.next(ChatMessageValueTypes.Quill);
		}

		combineLatest(
			this.activatedRoute.data,
			this.activatedRoute.params,
			this.activatedRoute.url
		).subscribe(async ([
			{callType},
			{sessionSubID, username},
			[{path}]
		]: [
			{callType?: 'audio'|'video'},
			{sessionSubID?: string, username?: string},
			UrlSegment[]
		]) => {
			if (!username) {
				return;
			}

			if (this.initiated) {
				this.router.navigate([accountRoot]);
				await sleep(0);
				this.router.navigate([accountRoot, path, username]);
				return;
			}

			this.initiated	= true;
			await this.accountChatService.setUser(username, undefined, callType, sessionSubID);

			if (callType === undefined) {
				return;
			}

			this.p2pWebRTCService.disconnect.pipe(take(1)).toPromise().then(() => {
				if (!this.destroyed) {
					this.router.navigate([accountRoot, 'messages', username]);
				}
			});
		});
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountChatService: AccountChatService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountSessionService */
		public readonly accountSessionService: AccountSessionService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see P2PService */
		public readonly p2pService: P2PService,

		/** @see P2PWebRTCService */
		public readonly p2pWebRTCService: P2PWebRTCService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
