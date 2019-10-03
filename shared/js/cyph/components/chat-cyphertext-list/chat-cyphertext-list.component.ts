import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {ChatMessage} from '../../chat';
import {StringsService} from '../../services/strings.service';
import {trackByID} from '../../track-by/track-by-id';

/**
 * Angular component for cyphertext message list.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-chat-cyphertext-list',
	styleUrls: ['./chat-cyphertext-list.component.scss'],
	templateUrl: './chat-cyphertext-list.component.html'
})
export class ChatCyphertextListComponent extends BaseProvider {
	/** @see CyphertextService.messages */
	@Input() public messages?: ChatMessage[];

	/** @see trackByID */
	public readonly trackByID = trackByID;

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
