import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
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
import {SessionInitService} from '../../services/session-init.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {ISessionMessageData, rpcEvents} from '../../session';
import {normalize} from '../../util/formatting';

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

	/** Username to start activating this device for. */
	@Input() public activateForUsername?: string;

	/**
	 * Emits on activation completion.
	 * @returns Success status.
	 */
	@Output() public readonly activationComplete = new EventEmitter<boolean>();

	/** Emits alt master key on succesful activation completion. */
	@Output() public readonly altMasterKey = new EventEmitter<string>();

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

	/** Initializes new device activation. */
	public async init (bobSessionID?: string) : Promise<void> {
		if (typeof bobSessionID === 'string' && this.activateForUsername) {
			this.sessionData = {
				aliceMasterKey: undefined,
				bobSessionID,
				username: this.activateForUsername
			};

			this.changeDetectorRef.detectChanges();
		}

		if (!this.sessionData) {
			return;
		}

		const masterKeyPromise = this.sessionData.bobSessionID ?
			(async () =>
				((await this.sessionService.one<ISessionMessageData[]>(
					rpcEvents.accountMasterKey
				)) || [])[0]?.command?.additionalData)() :
			undefined;

		this.basicSessionInitService.setID(
			this.sessionData.bobSessionID ? this.sessionData.bobSessionID : '',
			normalize(this.sessionData.username),
			true
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

			this.activationComplete.emit(true);

			this.wasSuccessful = true;

			return;
		}

		const masterKey = await masterKeyPromise;

		this.sessionService.close();

		if (masterKey === undefined) {
			return;
		}

		this.altMasterKey.emit(masterKey);
		this.activationComplete.emit(true);

		this.wasSuccessful = true;
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		super.ngOnDestroy();

		if (!this.wasSuccessful) {
			this.activationComplete.emit(false);
		}
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		await this.init();
	}

	constructor (
		/** @ignore */
		private readonly basicSessionInitService: BasicSessionInitService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @see ChangeDetectorRef */
		public readonly changeDetectorRef: ChangeDetectorRef,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
