import {Component, OnInit} from '@angular/core';
import * as $ from 'jquery';
import {CyphertextService} from '../services/cyphertext.service';
import {EnvService} from '../services/env.service';


/**
 * Angular component for chat cyphertext UI.
 */
@Component({
	selector: 'cyph-chat-cyphertext',
	styleUrls: ['../../css/components/chat-cyphertext.scss'],
	templateUrl: '../../templates/chat-cyphertext.html'
})
export class ChatCyphertextComponent implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		/* Close cyphertext on esc */
		$(window).keyup(e => {
			if (e.keyCode === 27) {
				this.cyphertextService.hide();
			}
		});
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @see CyphertextService */
		public readonly cyphertextService: CyphertextService
	) {}
}
