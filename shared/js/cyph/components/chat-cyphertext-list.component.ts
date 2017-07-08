import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {List} from 'immutable';
import {IChatMessage} from '../../proto';
import {StringsService} from '../services/strings.service';
import {Users, users} from '../session/enums';


/**
 * Angular component for cyphertext message list.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-chat-cyphertext-list',
	styleUrls: ['../../../css/components/chat-cyphertext-list.scss'],
	templateUrl: '../../../templates/chat-cyphertext-list.html'
})
export class ChatCyphertextListComponent {
	/** @see CyphertextService.messages */
	@Input() public messages: List<IChatMessage>;

	/** @see Users */
	public readonly users: Users	= users;

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
