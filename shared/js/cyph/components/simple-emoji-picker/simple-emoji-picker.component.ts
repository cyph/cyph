import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Output
} from '@angular/core';
import {EmojiEvent} from '@ctrl/ngx-emoji-mart/ngx-emoji';
import {BaseProvider} from '../../base-provider';
import {ConfigService} from '../../services/config.service';
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
	/** @see PickerComponent.emojiSelect */
	@Output() public readonly emojiSelect = new EventEmitter<EmojiEvent>();

	/** @see PickerComponent.emojisToShowFilter */
	public readonly emojisToShowFilter = (emoji: string) =>
		this.configService.simpleEmoji.has(emoji);

	constructor (
		/** @see ConfigService */
		public readonly configService: ConfigService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
