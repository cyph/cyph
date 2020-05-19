import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	OnDestroy,
	OnInit,
	Output
} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {burnerChatProviders} from '../../providers/burner-chat';
import {BasicSessionInitService} from '../../services/basic-session-init.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {SessionInitService} from '../../services/session-init.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {ISessionMessageData, rpcEvents} from '../../session';

/**
 * Angular component for account new device activation UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		...burnerChatProviders,
		BasicSessionInitService,
		{
			provide: SessionInitService,
			useExisting: BasicSessionInitService
		}
	],
	selector: 'cyph-account-new-device-activation',
	styleUrls: ['./account-new-device-activation.component.scss'],
	templateUrl: './account-new-device-activation.component.html'
})
export class AccountNewDeviceActivationComponent extends BaseProvider
	implements OnDestroy, OnInit {
	/** @ignore */
	private wasSuccessful: boolean = false;

	/** Indicates whether or not a mobile device is being activated. */
	@Input() public mobile: boolean = false;

	/** Data for establishing session and determining whether this is Alice or Bob. */
	@Input() public sessionData?:
		| {
				aliceMasterKey: string;
				bobSessionID: undefined;
				username: string;
		  }
		| {
				aliceMasterKey: undefined;
				bobSessionID: string;
				username: string;
		  };

	/**
	 * Emits on activation completion.
	 * @returns Success status.
	 */
	@Output() public readonly success = new EventEmitter<boolean>();

	/** @inheritDoc */
	public ngOnDestroy () : void {
		super.ngOnDestroy();

		if (!this.wasSuccessful) {
			this.success.emit(false);
		}
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!this.sessionData) {
			return;
		}

		this.basicSessionInitService.setID(
			this.sessionData.bobSessionID ? this.sessionData.bobSessionID : '',
			this.sessionData.username
		);

		await this.sessionService.connected;

		if (this.sessionData.aliceMasterKey) {
			await (await this.sessionService.send([
				rpcEvents.accountMasterKey,
				{
					command: {
						additionalData: this.sessionData.aliceMasterKey,
						method: ''
					}
				}
			])).confirmPromise;

			this.sessionService.close();

			return;
		}

		const masterKey = (await this.sessionService.one<ISessionMessageData>(
			rpcEvents.accountMasterKey
		)).command?.additionalData;

		this.sessionService.close();

		if (masterKey === undefined) {
			return;
		}

		await this.accountAuthService.login(
			this.sessionData.username,
			masterKey,
			undefined,
			true
		);
	}

	constructor (
		/** @ignore */
		private readonly accountAuthService: AccountAuthService,

		/** @ignore */
		private readonly basicSessionInitService: BasicSessionInitService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
