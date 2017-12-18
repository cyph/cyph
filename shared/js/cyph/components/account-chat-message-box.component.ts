import {Component} from '@angular/core';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for account chat message box UI.
 */
@Component({
	selector: 'cyph-account-chat-message-box',
	styleUrls: ['../../../css/components/account-chat-message-box.scss'],
	templateUrl: '../../../templates/account-chat-message-box.html'
})
export class AccountChatMessageBoxComponent {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
