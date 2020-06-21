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
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {burnerChatProviders} from '../../providers/burner-chat';
import {BasicSessionInitService} from '../../services/basic-session-init.service';
import {ConfigService} from '../../services/config.service';
import {EnvService} from '../../services/env.service';
import {SessionInitService} from '../../services/session-init.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {RpcEvents} from '../../session';
import {normalize} from '../../util/formatting';
import {readableID} from '../../util/uuid';
import {resolvable} from '../../util/wait';

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

	/** Answer to master key confirmation code verification. */
	public readonly masterKeyConfirmationAnswer = resolvable<boolean>();

	/** Confirmation code to verify before master key is transmitted. */
	public readonly masterKeyConfirmationCode = new BehaviorSubject<
		string | undefined
	>(undefined);

	/** Indicates whether or not a mobile device is being activated. */
	@Input() public mobile: boolean = false;

	/** Indicates whether or not new device activation is for a mobile device. */
	public readonly mobileDeviceActivation = new BehaviorSubject<boolean>(
		false
	);

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
		this.mobileDeviceActivation.next(this.mobile);

		if (typeof bobSessionID === 'string' && this.activateForUsername) {
			this.sessionData =
				bobSessionID.length > this.configService.cyphIDLength ?
					{
						aliceMasterKey: undefined,
						bobSessionID,
						username: this.activateForUsername
					} :
					undefined;

			this.changeDetectorRef.detectChanges();
		}

		if (!this.sessionData) {
			return;
		}

		const masterKeyConfirmationCodePromise = this.sessionData.bobSessionID ?
			(async () =>
				((await this.sessionService.one(
					RpcEvents.accountMasterKeyConfirmation
				)) || [])[0]?.command?.additionalData)() :
			undefined;

		const masterKeyPromise = this.sessionData.bobSessionID ?
			(async () =>
				((await this.sessionService.one(RpcEvents.accountMasterKey)) ||
					[])[0]?.command?.additionalData)() :
			undefined;

		this.basicSessionInitService.setID(
			this.sessionData.bobSessionID ? this.sessionData.bobSessionID : '',
			normalize(this.sessionData.username),
			true
		);

		await this.sessionService.connected;

		if (this.sessionData.aliceMasterKey) {
			const masterKeyConfirmationCode = readableID(
				this.configService.cyphIDLength
			);

			await (await this.sessionService.send([
				RpcEvents.accountMasterKeyConfirmation,
				{
					command: {
						additionalData: masterKeyConfirmationCode,
						method: ''
					}
				}
			])).confirmPromise;

			this.masterKeyConfirmationCode.next(masterKeyConfirmationCode);

			if (!(await this.masterKeyConfirmationAnswer)) {
				this.sessionService.close();
				this.activationComplete.emit(false);
				this.wasSuccessful = false;
				return;
			}

			await (await this.sessionService.send([
				RpcEvents.accountMasterKey,
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

		this.masterKeyConfirmationCode.next(
			await masterKeyConfirmationCodePromise
		);

		const masterKey = await Promise.race([
			masterKeyPromise,
			this.sessionService.closed.then(() => undefined)
		]);

		this.sessionService.close();

		if (masterKey === undefined) {
			this.activationComplete.emit(false);
			this.wasSuccessful = false;
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
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @see ChangeDetectorRef */
		public readonly changeDetectorRef: ChangeDetectorRef,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
