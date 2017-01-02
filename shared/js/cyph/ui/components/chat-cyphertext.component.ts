import {Component, OnInit} from '@angular/core';
import {CyphertextService} from '../services/cyphertext.service';
import {SessionService} from '../services/session.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for chat cyphertext UI.
 */
@Component({
	selector: 'cyph-chat-cyphertext',
	templateUrl: '../../../../templates/chat-cyphertext.html'
})
export class ChatCyphertextComponent implements OnInit {
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
		public readonly cyphertextService: CyphertextService,

		/** @see SessionService */
		public readonly sessionService: SessionService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
