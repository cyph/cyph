import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	Input,
	ElementRef
} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import * as $ from 'jquery';
import {BehaviorSubject} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {ChatService} from '../../services/chat.service';
import {ConfigService} from '../../services/config.service';
import {DatabaseService} from '../../services/database.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {P2PWebRTCService} from '../../services/p2p-webrtc.service';
import {QRService} from '../../services/qr.service';
import {SessionInitService} from '../../services/session-init.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {Timer} from '../../timer';
import {copyToClipboard} from '../../util/clipboard';
import {filterUndefinedOperator} from '../../util/filter';
import {lockTryOnce} from '../../util/lock';
import {sleep, waitForIterable} from '../../util/wait';
import {LinkConnectionEmailComponent} from '../link-connection-email';

/**
 * Angular component for a link-based initial connection screen
 * (e.g. for starting a new cyph).
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-link-connection',
	styleUrls: ['./link-connection.component.scss'],
	templateUrl: './link-connection.component.html'
})
export class LinkConnectionComponent extends BaseProvider
	implements AfterViewInit {
	/** @ignore */
	private readonly addTimeLock = {};

	/** @ignore */
	private connectLinkInput?: HTMLInputElement;

	/** @ignore */
	private readonly copyLock = {};

	/** @ignore */
	private linkConstant: string = '';

	/** Indicates whether the advanced features menu is open. */
	public readonly advancedFeatures = new BehaviorSubject<boolean>(false);

	/** Forces focus on input. */
	public forceFocus: boolean = true;

	/** Indicates whether this link connection was initiated passively via API integration. */
	public readonly isPassive = new BehaviorSubject<boolean | undefined>(
		undefined
	);

	/** The link to join this connection. */
	public readonly link = new BehaviorSubject<string>('');

	/** Safe version of this link. */
	public readonly linkHref = new BehaviorSubject<SafeUrl | undefined>(
		undefined
	);

	/** Safe SMS version of this link. */
	public readonly linkSMS = new BehaviorSubject<SafeUrl | undefined>(
		undefined
	);

	/** @see AccountNewDeviceActivationComponent.mobileDeviceActivation */
	@Input() public mobileDeviceActivation: boolean = false;

	/** Special mode for new device activation. */
	@Input() public newDeviceActivation: boolean = false;

	/** Draft of queued message. */
	public readonly queuedMessageDraft = new BehaviorSubject<string>('');

	/** Counts down until link expires. */
	@Input() public timer: Timer | undefined = new Timer(
		this.configService.cyphCountdown,
		false
	);

	/** Extends the countdown duration. */
	public async addTime (milliseconds: number) : Promise<void> {
		if (!this.timer) {
			return;
		}

		this.timer.addTime(milliseconds);

		await lockTryOnce(this.addTimeLock, async () => {
			await this.dialogService.toast(
				this.stringsService.timeExtended,
				2500
			);
		});
	}

	/** Copies link to clipboard. */
	public async copyToClipboard (
		successToast: string = this.stringsService.linkCopied
	) : Promise<void> {
		await lockTryOnce(this.copyLock, async () =>
			copyToClipboard(
				this.linkConstant,
				successToast,
				this.stringsService.clipboardCopyFail
			)
		);
	}

	/** Emails link. */
	public async email () : Promise<void> {
		this.forceFocus = false;

		await this.dialogService.baseDialog(LinkConnectionEmailComponent, o => {
			o.link = this.linkConstant;
		});

		this.forceFocus = true;
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		await this.sessionService.state.ephemeralStateInitialized
			.pipe(
				filter(b => b),
				take(1)
			)
			.toPromise();

		if (
			this.sessionService.state.wasInitiatedByAPI.value ||
			!this.sessionService.state.startingNewCyph.value
		) {
			this.isPassive.next(true);
			return;
		}

		let isWaiting = true;

		const sharedSecret = (await this.sessionService.state.sharedSecret
			.pipe(
				filterUndefinedOperator(),
				filter(s => s.length > 0),
				take(1)
			)
			.toPromise()).split(' ')[0];

		this.linkConstant = this.newDeviceActivation ?
			sharedSecret :
			this.envService.cyphImUrl +
			(this.envService.cyphImUrl.indexOf('#') > -1 ? '' : '#') +
			sharedSecret;

		const linkEncoded = encodeURIComponent(this.linkConstant);

		this.link.next(this.linkConstant);

		this.linkHref.next(this.linkConstant);

		this.linkSMS.next(
			this.domSanitizer.bypassSecurityTrustUrl(
				this.envService.smsUriBase + linkEncoded
			)
		);

		this.isPassive.next(false);

		if (this.elementRef.nativeElement && this.envService.isWeb) {
			const $element = $(this.elementRef.nativeElement);

			if (this.envService.isMobileOS) {
				const $connectLinkLink = await waitForIterable(() =>
					$element.find('.connect-link-link')
				);

				/* Only allow right-clicking (for copying the link) */
				$connectLinkLink.on('click', e => {
					e.preventDefault();
				});
			}
			else {
				this.connectLinkInput = <HTMLInputElement> (
					(await waitForIterable(() =>
						document.querySelectorAll('.connect-link-input')
					))[0]
				);

				this.onBlur();
			}

			await waitForIterable(() => $element.filter(':visible'));
		}
		else {
			/* TODO: HANDLE NATIVE */
		}

		this.sessionService.channelConnected.then(() => {
			isWaiting = false;
			this.linkConstant = '';

			this.link.next('');
			this.linkHref.next(undefined);
			this.linkSMS.next(undefined);

			if (this.timer) {
				this.timer.stop();
			}
		});

		if (!this.timer) {
			return;
		}

		await sleep(1000);
		await this.timer.start();

		if (isWaiting) {
			isWaiting = false;
			this.chatService.abortSetup();
		}
	}

	/** Blur event handler. */
	public async onBlur () : Promise<void> {
		await sleep(0);

		if (
			!this.forceFocus ||
			!this.connectLinkInput ||
			this.advancedFeatures.value
		) {
			return;
		}

		this.connectLinkInput.focus();
		this.connectLinkInput.setSelectionRange(0, this.linkConstant.length);
	}

	/** Resets link value. */
	public async resetLinkValue (value: string) : Promise<void> {
		this.link.next(value);
		await sleep(0);
		this.link.next(this.linkConstant);
		await sleep(0);

		this.onBlur();
	}

	/** Sends a link to install Cyph to the specified phone number. */
	public async sendAppLink (phoneNumber: string) : Promise<void> {
		if (!phoneNumber) {
			return;
		}

		await this.dialogService.toast(
			await this.databaseService
				.callFunction('sendAppLink', {phoneNumber})
				.then(() => this.stringsService.sendAppLinkSuccess)
				.catch(() => this.stringsService.sendAppLinkFailure),
			undefined,
			this.stringsService.ok
		);
	}

	constructor (
		/** @ignore */
		private readonly domSanitizer: DomSanitizer,

		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see P2PWebRTCService */
		public readonly p2pWebRTCService: P2PWebRTCService,

		/** @see QRService */
		public readonly qrService: QRService,

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see SessionInitService */
		public readonly sessionInitService: SessionInitService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
