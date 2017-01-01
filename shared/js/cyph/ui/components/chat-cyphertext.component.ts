import {Component, OnInit} from '@angular/core';
import {Users, users} from '../../session/enums';
import {Strings, strings} from '../../strings';
import {CyphertextService} from '../services/cyphertext.service';


/**
 * Angular component for chat cyphertext UI.
 */
@Component({
	selector: 'cyph-chat-cyphertext',
	templateUrl: '../../../../templates/chat-cyphertext.html'
})
export class ChatCyphertextComponent implements OnInit {
	/** @see Strings */
	public readonly strings: Strings	= strings;

	/** @see Users */
	public readonly users: Users		= users;

	/** @inheritDoc */
	public ngOnInit () : void {
		/* Close cyphertext on esc */
		$(window).keyup(e => {
			if (e.keyCode === 27) {
				this.cyphertextService.hide();
			}
		});
	}

	constructor (
		/** @see CyphertextService */
		public readonly cyphertextService: CyphertextService
	) {}
}
