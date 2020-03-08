import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for simple emoji picker UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-simple-emoji-picker',
	styleUrls: ['./simple-emoji-picker.component.scss'],
	templateUrl: './simple-emoji-picker.component.html'
})
export class SimpleEmojiPickerComponent extends BaseProvider {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
