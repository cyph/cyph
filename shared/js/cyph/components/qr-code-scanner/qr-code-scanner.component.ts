import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	OnDestroy,
	Output,
	ViewChild
} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {VideoComponent} from '../../components/video';
import {StringsService} from '../../services/strings.service';
import {QRService} from '../../services/qr.service';
import {debugLogError} from '../../util/log';
import {requestPermissions} from '../../util/permissions';
import {resolvable, waitForValue} from '../../util/wait';

/**
 * Angular component for QR code scanner UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-qr-code-scanner',
	styleUrls: ['./qr-code-scanner.component.scss'],
	templateUrl: './qr-code-scanner.component.html'
})
export class QRCodeScannerComponent
	extends BaseProvider
	implements OnDestroy, AfterViewInit
{
	/** Activated. */
	public readonly activated = resolvable(true);

	/** cyph-video element. */
	@ViewChild('cyphVideo', {read: VideoComponent})
	public cyphVideo?: VideoComponent;

	/** Indicates whether scanning is in progress. */
	public readonly isActive = new BehaviorSubject<boolean>(true);

	/**
	 * Emits on QR code scan completion.
	 * @returns QR code data, if applicable.
	 */
	@Output() public readonly scanComplete = new EventEmitter<
		string | undefined
	>();

	/** Camera feed. */
	public readonly videoStream = (async () => {
		try {
			if (!(await requestPermissions('CAMERA'))) {
				throw new Error('Failed to attain camera permission.');
			}
		}
		catch (err) {
			debugLogError(() => ({
				qrCodeScanner: {permissionsFailure: err}
			}));
			return undefined;
		}

		await this.activated;

		const constraints = {video: {facingMode: 'environment'}};

		try {
			return await navigator.mediaDevices.getUserMedia(constraints);
		}
		catch (err) {
			debugLogError(() => ({
				qrCodeScanner: {navigatorMediaDevicesGetUserMedia: err}
			}));
		}

		try {
			return await new Promise<MediaStream>((resolve, reject) => {
				navigator.getUserMedia(constraints, resolve, reject);
			});
		}
		catch (err) {
			debugLogError(() => ({
				qrCodeScanner: {navigatorGetUserMedia: err}
			}));
		}

		return undefined;
	})();

	/** Ends video stream. */
	public async closeVideo () : Promise<void> {
		this.isActive.next(false);

		for (const track of (await this.videoStream)?.getTracks() || []) {
			track.enabled = false;
			track.stop();
		}
	}

	/** @inheritDoc */
	public async ngOnDestroy () : Promise<void> {
		await this.closeVideo();
	}

	/** @inheritDoc */
	public async ngAfterViewInit () : Promise<void> {
		try {
			const videoStream = await this.videoStream;

			if (videoStream === undefined) {
				return;
			}

			const video = await waitForValue(
				() => this.cyphVideo?.video?.nativeElement
			);

			this.scanComplete.emit(await this.qrService.scanQRCode(video));
		}
		finally {
			await this.closeVideo();
		}
	}

	constructor (
		/** @ignore */
		private readonly qrService: QRService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
