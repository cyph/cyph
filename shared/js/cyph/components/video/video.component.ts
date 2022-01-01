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
import {map} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';
import {WindowWatcherService} from '../../services/window-watcher.service';
import {observableAll} from '../../util/observable-all';

/**
 * Angular component for video UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-video',
	styleUrls: ['./video.component.scss'],
	templateUrl: './video.component.html'
})
export class VideoComponent
	extends BaseProvider
	implements AfterViewInit, OnChanges, OnDestroy
{
	/** @ignore */
	private audioContext?: {
		alive: boolean;
		analyser: AnalyserNode;
		context: AudioContext;
	};

	/** @ignore */
	private srcObjectURL?: string;

	/** @ignore */
	private readonly videoElement = new BehaviorSubject<
		HTMLVideoElement | undefined
	>(undefined);

	/** Audio level. */
	public readonly audioLevel = new BehaviorSubject<number>(0);

	/** Audio level bar size and position. */
	public readonly audioLevelBar = observableAll([
		this.videoElement,
		this.windowWatcherService.dimensions
	]).pipe(
		map(([video]) => {
			if (!video) {
				return {height: '0px', position: '0px'};
			}

			const height =
				video.videoWidth > 0 && video.videoHeight > 0 ?
					Math.min(
						video.clientHeight,
						Math.round(
							(video.clientWidth / video.videoWidth) *
								video.videoHeight
						)
					) :
					video.clientHeight;

			const width =
				video.videoWidth > 0 && video.videoHeight > 0 ?
					Math.min(
						video.clientWidth,
						Math.round(
							(video.clientHeight / video.videoHeight) *
								video.videoWidth
						)
					) :
					video.clientWidth;

			const position = Math.round(
				(video.clientWidth - width) / 2 - height / 2 - 2
			);

			return {
				height: `${height.toString()}px`,
				position: `${position.toString()}px`
			};
		})
	);

	/** @see HTMLVideoElement.autoplay */
	@Input() public autoplay: boolean = false;

	/** @see HTMLVideoElement.muted */
	@Input() public muted: boolean = false;

	/** @see HTMLVideoElement.playsinline */
	@Input() public playsinline: boolean = false;

	/** Indicates whether audio level should be displayed. */
	@Input() public showAudioLevel: boolean = false;

	/** Path, URL, or `srcObject`. */
	@Input() public src?: string | MediaProvider;

	/** Title to display in video header. */
	@Input() public title?: string;

	/** Video element. */
	@ViewChild('video') public video?: ElementRef<HTMLVideoElement>;

	/** @ignore */
	private setVideoSrc (src?: string | MediaProvider) : void {
		if (this.audioContext) {
			this.audioContext.alive = false;
		}

		if (this.srcObjectURL) {
			URL.revokeObjectURL(this.srcObjectURL);
			this.srcObjectURL = undefined;
		}

		if (!(this.video?.nativeElement instanceof HTMLVideoElement)) {
			this.subscribeAudioLevels();
			this.subscribeVideoElement();
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
			/*
				MediaStream argument to URL.createObjectURL is deprecated,
				but any environments that don't support it will support
				HTMLVideoElement.prototype.
			*/
			this.srcObjectURL = URL.createObjectURL(<any> src);
			this.video.nativeElement.src = this.srcObjectURL;
		}

		this.video.nativeElement.muted = this.muted;

		this.subscribeAudioLevels();
		this.subscribeVideoElement();
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
				alive: true,
				analyser: context.createAnalyser(),
				context
			};
		}
		catch {
			this.showAudioLevel = false;
		}

		if (!this.audioContext) {
			return;
		}

		const audioContext = this.audioContext;
		const {analyser, context} = audioContext;

		analyser.fftSize = 512;
		analyser.minDecibels = -127;
		analyser.maxDecibels = 0;
		analyser.smoothingTimeConstant = 0.4;

		let src: MediaStreamAudioSourceNode | undefined;

		const sub = this.videoElement.subscribe(video => {
			src?.disconnect();

			if (
				!audioContext.alive ||
				!(video?.srcObject instanceof MediaStream) ||
				video.srcObject.getAudioTracks().length < 1
			) {
				return;
			}

			src = context.createMediaStreamSource(video.srcObject);
			src.connect(analyser);
		});

		const input = new Uint8Array(analyser.frequencyBinCount);

		const updateAudioLevel = () => {
			if (!audioContext.alive) {
				sub.unsubscribe();
				src?.disconnect();
				return;
			}

			analyser.getByteFrequencyData(input);

			let sum = 0;
			/* eslint-disable-next-line @typescript-eslint/prefer-for-of */
			for (let i = 0; i < input.length; ++i) {
				sum += input[i];
			}

			const average = sum / input.length;

			this.audioLevel.next(
				Math.min(Math.floor((average * 100) / 127), 100)
			);

			requestAnimationFrame(updateAudioLevel);
		};

		requestAnimationFrame(updateAudioLevel);
	}

	/** @ignore */
	private async subscribeVideoElement () : Promise<void> {
		const video = this.video?.nativeElement;

		if (!video) {
			this.videoElement.next(undefined);
			return;
		}

		const f = () => {
			this.videoElement.next(video);

			if (this.video?.nativeElement === video) {
				return;
			}

			video.removeEventListener('resize', f);

			if (this.videoElement.value !== video) {
				return;
			}

			this.videoElement.next(undefined);
		};

		f();
		video.addEventListener('resize', f);
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
		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
