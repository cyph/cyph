import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	OnInit
} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import memoize from 'lodash-es/memoize';
import PinchZoom from 'pinch-zoom-js';
import {BaseProvider} from '../../base-provider';
import {IResolvable} from '../../iresolvable';
import {DataURIProto} from '../../proto';
import {FileService} from '../../services/file.service';
import {StringsService} from '../../services/strings.service';
import {saveFile} from '../../util/save-file';
import {uuid} from '../../util/uuid';

/**
 * Angular component for image dialog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-dialog-media',
	styleUrls: ['./dialog-media.component.scss'],
	templateUrl: './dialog-media.component.html'
})
export class DialogMediaComponent extends BaseProvider implements OnInit {
	/** Aspect ratio for cropping. */
	public cropAspectRatio?: number;

	/** Callback for cropping image. */
	public cropResult?: IResolvable<SafeUrl | undefined>;

	/** In-progress cropped image. */
	public cropped?: string;

	/** ID of image element. */
	public readonly imageID: string = `id-${uuid()}`;

	/** MIME type. */
	public mediaType: string = 'image/png';

	/** @see DataURIProto.safeUrlToString */
	public readonly safeUrlToString = memoize(
		async (data?: SafeUrl | string, mediaType?: string) =>
			!data ?
				undefined :
				DataURIProto.safeUrlToString(data, mediaType).catch(
					() => undefined
				)
	);

	/** String to SafeUrl. */
	public readonly stringToSafeUrl = memoize((data?: SafeUrl | string) =>
		typeof data !== 'string' ?
			data :
			this.domSanitizer.bypassSecurityTrustUrl(data)
	);

	/** Image src. */
	public src?: SafeUrl | string;

	/** Image title. */
	public title?: string;

	/** Return final cropped image. */
	public async crop (accept: boolean) : Promise<void> {
		if (!this.cropResult || !this.src) {
			return;
		}

		this.cropResult.resolve(
			!accept ?
				undefined :
			this.cropped ?
				this.domSanitizer.bypassSecurityTrustUrl(this.cropped) :
			typeof this.src === 'string' ?
				this.domSanitizer.bypassSecurityTrustUrl(this.src) :
				this.src
		);

		this.matDialogRef.close();
	}

	/** Downloads media. */
	public async download () : Promise<void> {
		const src = await this.safeUrlToString(this.src);

		if (!src) {
			return;
		}

		saveFile(this.fileService.fromDataURI(src), this.title || '');
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		await this.matDialogRef.afterOpened().toPromise();

		if (!(this.elementRef.nativeElement instanceof HTMLElement)) {
			return;
		}

		const parent = this.elementRef.nativeElement.parentElement;
		if (!parent) {
			return;
		}

		const grandparent = parent.parentElement;
		if (!grandparent) {
			return;
		}

		const ancestorStyles = `
			border-radius: 0 !important;
			width: 100vw !important;
			max-width: 100vw !important;
			height: 100vh !important;
			max-height: 100vh !important;
			pointer-events: all !important;
			visibility: visible !important;
		`;

		grandparent.classList.add('cyph-light-theme');

		parent.style.cssText = `
			${ancestorStyles}
			padding: 8px !important;
		`;

		grandparent.style.cssText = ancestorStyles;

		const image = document.getElementById(this.imageID);
		if (image instanceof HTMLImageElement) {
			new PinchZoom(image);
		}
	}

	constructor (
		/** @ignore */
		private readonly domSanitizer: DomSanitizer,

		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly matDialogRef: MatDialogRef<DialogMediaComponent>,

		/** @see ChangeDetectorRef */
		public readonly changeDetectorRef: ChangeDetectorRef,

		/** @see FileService */
		public readonly fileService: FileService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
