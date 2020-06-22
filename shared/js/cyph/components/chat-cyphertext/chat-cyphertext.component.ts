import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import * as $ from 'jquery';
import {BaseProvider} from '../../base-provider';
import {CyphertextService} from '../../services/cyphertext.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for chat cyphertext UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-chat-cyphertext',
	styleUrls: ['./chat-cyphertext.component.scss'],
	templateUrl: './chat-cyphertext.component.html'
})
export class ChatCyphertextComponent extends BaseProvider implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		/* Close cyphertext on esc */
		$(window).on('keyup', e => {
			if (e.key === 'Escape') {
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
	) {
		super();
	}
}
