import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import memoize from 'lodash-es/memoize';
import {BaseProvider} from '../../base-provider';
import {IResolvable} from '../../iresolvable';
import {DataURIProto} from '../../proto';
import {FileService} from '../../services/file.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for image dialog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-dialog-media',
	styleUrls: ['./dialog-media.component.scss'],
	templateUrl: './dialog-media.component.html'
})
export class DialogMediaComponent extends BaseProvider {
	/** Aspect ratio for cropping. */
	public cropAspectRatio?: number;

	/** Callback for cropping image. */
	public cropResult?: IResolvable<SafeUrl | undefined>;

	/** In-progress cropped image. */
	public cropped?: string;

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

	constructor (
		/** @ignore */
		private readonly domSanitizer: DomSanitizer,

		/** @ignore */
		private readonly matDialogRef: MatDialogRef<DialogMediaComponent>,

		/** @see FileService */
		public readonly fileService: FileService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
