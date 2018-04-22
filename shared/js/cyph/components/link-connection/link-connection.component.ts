import {AfterViewInit, Component, ElementRef} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import clipboard from 'clipboard-polyfill';
import * as $ from 'jquery';
import {ChatService} from '../../services/chat.service';
import {ConfigService} from '../../services/config.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {SessionService} from '../../services/session.service';
import {StringsService} from '../../services/strings.service';
import {Timer} from '../../timer';
import {lockTryOnce} from '../../util/lock';
import {sleep, waitForIterable, waitForValue} from '../../util/wait';


/**
 * Angular component for a link-based initial connection screen
 * (e.g. for starting a new cyph).
 */
@Component({
	selector: 'cyph-link-connection',
	styleUrls: ['./link-connection.component.scss'],
	templateUrl: './link-connection.component.html'
})
export class LinkConnectionComponent implements AfterViewInit {
	/** @ignore */
	private readonly addTimeLock: {}	= {};

	/** @ignore */
	private readonly copyLock: {}		= {};

	/** @ignore */
	private linkConstant: string			= '';

	/** Indicates whether the advanced features menu is open. */
	public advancedFeatures: boolean		= false;

	/** Indicates whether this link connection was initiated passively via API integration. */
	public isPassive: boolean				= false;

	/** The link to join this connection. */
	public link?: string;

	/** Mailto version of this link. */
	public linkMailto?: SafeUrl;

	/** SMS version of this link. */
	public linkSMS?: SafeUrl;

	/** Draft of queued message. */
	public queuedMessageDraft: string		= '';

	/** Counts down until link expires. */
	public timer?: Timer;

	/** Extends the countdown duration. */
	public async addTime (milliseconds: number) : Promise<void> {
		if (this.timer) {
			this.timer.addTime(milliseconds);
		}

		await lockTryOnce(
			this.addTimeLock,
			async () => { await this.dialogService.toast(
				this.stringsService.timeExtended,
				2500
			); }
		);
	}

	/** Copies link to clipboard. */
	public async copyToClipboard () : Promise<void> {
		await lockTryOnce(
			this.copyLock,
			async () => { await this.dialogService.toast(
				await clipboard.writeText(this.linkConstant).
					then(() => this.stringsService.linkCopied).
					catch(() => this.stringsService.linkCopyFail)
				,
				2500
			); }
		);
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		let isWaiting		= true;

		await waitForValue(() => this.sessionService.state.sharedSecret || undefined);

		this.isPassive		= this.sessionService.state.wasInitiatedByAPI;

		if (this.isPassive || !this.sessionService.state.startingNewCyph) {
			return;
		}

		this.linkConstant	=
			this.envService.newCyphUrl +
			(this.envService.newCyphUrl.indexOf('#') > -1 ? '' : '#') +
			this.sessionService.state.sharedSecret
		;

		const linkEncoded	= encodeURIComponent(this.linkConstant);

		this.linkMailto		= this.domSanitizer.bypassSecurityTrustUrl(
			`mailto:?subject=Cyph&body=${linkEncoded}`
		);

		this.linkSMS		= this.domSanitizer.bypassSecurityTrustUrl(
			this.envService.smsUriBase + linkEncoded
		);

		this.link			= this.linkConstant;
		this.timer			= new Timer(this.configService.cyphCountdown, false);

		if (this.elementRef.nativeElement && this.envService.isWeb) {
			const $element		= $(this.elementRef.nativeElement);

			if (this.envService.isMobile) {
				const $connectLinkLink	= await waitForIterable(
					() => $element.find('.connect-link-link')
				);

				/* Only allow right-clicking (for copying the link) */
				$connectLinkLink.on('click', e => { e.preventDefault(); });
			}
			else {
				const $connectLinkInput	= await waitForIterable(
					() => $element.find('.connect-link-input')
				);

				const connectLinkInput	= <HTMLInputElement> $connectLinkInput[0];

				(async () => {
					while (isWaiting) {
						await sleep(1000);

						if (this.advancedFeatures) {
							continue;
						}

						if (this.link !== this.linkConstant) {
							this.link	= this.linkConstant;
						}

						$connectLinkInput.trigger('focus');
						connectLinkInput.setSelectionRange(0, this.linkConstant.length);
					}
				})();
			}

			await waitForIterable(() => $element.filter(':visible'));
		}
		else {
			/* TODO: HANDLE NATIVE */
		}

		this.sessionService.connected.then(() => {
			isWaiting			= false;
			this.link			= '';
			this.linkConstant	= '';
			this.linkMailto		= undefined;
			this.linkSMS		= undefined;

			if (this.timer) {
				this.timer.stop();
			}
		});

		await sleep(1000);
		await this.timer.start();

		if (isWaiting) {
			isWaiting	= false;
			this.chatService.abortSetup();
		}
	}

	constructor (
		/** @ignore */
		private readonly domSanitizer: DomSanitizer,

		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly configService: ConfigService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see ChatService */
		public readonly chatService: ChatService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
