import {Component, Input, OnInit} from '@angular/core';
import * as $ from 'jquery';
import {ChatMessageValueTypes} from '../proto';
import {CyphertextService} from '../services/cyphertext.service';
import {EnvService} from '../services/env.service';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for chat cyphertext UI.
 */
@Component({
	selector: 'cyph-chat-cyphertext',
	styleUrls: ['../../../css/components/chat-cyphertext.scss'],
	templateUrl: '../../../templates/chat-cyphertext.html'
})
export class ChatCyphertextComponent implements OnInit {
	/** Indicates whether this is the accounts UI. */
	@Input() public accounts: boolean	= false;

	/** Indicates which version of the UI should be displayed. */
	@Input() public messageType: ChatMessageValueTypes	= ChatMessageValueTypes.Text;

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
		public readonly cyphertextService: CyphertextService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
