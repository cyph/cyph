import {Component} from '@angular/core';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for chat compose UI.
 */
@Component({
	selector: 'cyph-chat-compose',
	styleUrls: ['../../../css/components/chat-compose.scss'],
	templateUrl: '../../../templates/chat-compose.html'
})
export class ChatComposeComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
