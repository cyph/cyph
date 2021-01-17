import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Input,
	OnChanges,
	OnDestroy,
	SimpleChanges,
	ViewChild
} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for video UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-video',
	styleUrls: ['./video.component.scss'],
	templateUrl: './video.component.html'
})
export class VideoComponent extends BaseProvider
	implements AfterViewInit, OnChanges, OnDestroy {
	/** @ignore */
	private audioContext?: {
		context: AudioContext;
		processor: ScriptProcessorNode;
		src: MediaStreamAudioSourceNode;
	};

	/** @ignore */
	private srcObjectURL?: string;

	/** Audio level. */
	public readonly audioLevel = new BehaviorSubject<number>(0);

	/** @see HTMLVideoElement.autoplay */
	@Input() public autoplay: boolean = false;

	/** @see HTMLVideoElement.muted */
	@Input() public muted: boolean = false;

	/** @see HTMLVideoElement.playsinline */
	@Input() public playsinline: boolean = false;

	/** Indicates whether audio level should be displayed. */
	@Input() public showAudioLevel: boolean = false;

	/** Path, URL, or `srcObject`. */
	@Input() public src?: string | MediaStream | MediaSource | Blob;

	/** Title to display in video header. */
	@Input() public title?: string;

	/** Video element. */
	@ViewChild('video') public video?: ElementRef<HTMLVideoElement>;

	/** @ignore */
	private setVideoSrc (
		src?: string | MediaStream | MediaSource | Blob
	) : void {
		if (this.audioContext) {
			this.audioContext.processor.disconnect();
			this.audioContext.src.disconnect();
		}

		if (this.srcObjectURL) {
			URL.revokeObjectURL(this.srcObjectURL);
			this.srcObjectURL = undefined;
		}

		if (!(this.video?.nativeElement instanceof HTMLVideoElement)) {
			this.subscribeAudioLevels();
			return;
		}

		if (!src) {
			if (this.video.nativeElement.src) {
				this.video.nativeElement.src = '';
				this.video.nativeElement.removeAttribute('src');
			}

			if ('srcObject' in HTMLVideoElement.prototype) {
				this.video.nativeElement.srcObject = new MediaStream();
			}
		}
		else if (typeof src === 'string') {
			this.video.nativeElement.src = src;
		}
		else if ('srcObject' in HTMLVideoElement.prototype) {
			this.video.nativeElement.srcObject = src;
		}
		else {
			this.srcObjectURL = URL.createObjectURL(src);
			this.video.nativeElement.src = this.srcObjectURL;
		}

		this.video.nativeElement.muted = this.muted;

		this.subscribeAudioLevels();
	}

	/** @ignore */
	private subscribeAudioLevels () : void {
		this.audioContext = undefined;
		this.audioLevel.next(0);

		if (
			!this.showAudioLevel ||
			!(this.video?.nativeElement?.srcObject instanceof MediaStream)
		) {
			return;
		}

		try {
			const context = new AudioContext();

			this.audioContext = {
				context,
				processor: context.createScriptProcessor(2048, 1, 1),
				src: context.createMediaStreamSource(
					this.video.nativeElement.srcObject
				)
			};
		}
		catch {
			this.showAudioLevel = false;
		}

		if (!this.audioContext) {
			return;
		}

		const {context, processor, src} = this.audioContext;

		src.connect(processor);
		processor.connect(context.destination);

		let lastTimestamp = 0;

		processor.addEventListener('audioprocess', e => {
			if (e.timeStamp - lastTimestamp < 100) {
				return;
			}

			lastTimestamp = e.timeStamp;

			const input = e.inputBuffer.getChannelData(0);

			let sum = 0;
			for (let i = 0; i < input.length; ++i) {
				sum += input[i] * input[i];
			}

			const average = Math.sqrt(sum / input.length);

			this.audioLevel.next(Math.min(Math.floor(average * 1000), 100));
		});
	}

	/** @inheritDoc */
	public ngAfterViewInit () : void {
		this.setVideoSrc(this.src);
	}

	/** @inheritDoc */
	public ngOnChanges (changes: SimpleChanges) : void {
		if (changes.src) {
			this.setVideoSrc(this.src);
		}
		else if (this.video?.nativeElement instanceof HTMLVideoElement) {
			this.video.nativeElement.muted = this.muted;
		}
	}

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.setVideoSrc(undefined);
	}

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
