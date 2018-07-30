import {ChangeDetectionStrategy, Component} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import memoize from 'lodash-es/memoize';
import {DataURIProto} from '../../proto';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for image dialog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-dialog-video',
	styleUrls: ['./dialog-video.component.scss'],
	templateUrl: './dialog-video.component.html'
})
export class DialogVideoComponent {
	/** @see DataURIProto.safeUrlToString */
	public readonly safeUrlToString	= memoize(async (data?: SafeUrl|string) =>
		!data ? undefined : DataURIProto.safeUrlToString(data).catch(() => undefined)
	);

	/** Image src. */
	public src?: SafeUrl|string;

	/** Image title. */
	public title?: string;


	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
