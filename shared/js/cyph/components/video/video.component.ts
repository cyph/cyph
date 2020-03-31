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
	private srcObjectURL?: string;

	/** @see HTMLVideoElement.autoplay */
	@Input() autoplay: boolean = false;

	/** @see HTMLVideoElement.muted */
	@Input() muted: boolean = false;

	/** @see HTMLVideoElement.playsinline */
	@Input() playsinline: boolean = false;

	/** Path, URL, or `srcObject`. */
	@Input() src?: string | MediaStream | MediaSource | Blob;

	/** Title to display in video header. */
	@Input() title?: string;

	/** Video element. */
	@ViewChild('video') public video?: ElementRef;

	/** @ignore */
	private setVideoSrc (
		src?: string | MediaStream | MediaSource | Blob
	) : void {
		if (this.srcObjectURL) {
			URL.revokeObjectURL(this.srcObjectURL);
			this.srcObjectURL = undefined;
		}

		if (!(this.video?.nativeElement instanceof HTMLVideoElement)) {
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
