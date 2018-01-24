import {Component} from '@angular/core';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for chat compose UI.
 */
@Component({
	selector: 'cyph-chat-compose',
	styleUrls: ['./chat-compose.component.scss'],
	templateUrl: './chat-compose.component.html'
})
export class ChatComposeComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
