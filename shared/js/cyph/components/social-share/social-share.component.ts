import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	Output
} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {WebSocialShareInput} from 'web-social-share';
import {
	applyPolyfills,
	defineCustomElements
} from 'web-social-share/dist/loader';
import {BaseProvider} from '../../base-provider';

applyPolyfills().then(() => {
	defineCustomElements(window);
});

/**
 * Angular component for social share UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-social-share',
	styleUrls: ['./social-share.component.scss'],
	templateUrl: './social-share.component.html'
})
export class SocialShareComponent extends BaseProvider {
	/** Share prompt close event. */
	@Output() public readonly close = new EventEmitter<void>();

	/** Share prompt options. */
	@Input() options: WebSocialShareInput = {config: []};

	/** Indicates whether or not share prompt is visible. */
	public readonly visible = new BehaviorSubject<boolean>(false);

	/** Close handler. */
	public onClose () : void {
		this.visible.next(false);
		this.close.emit();
	}

	/** Shows share prompt. */
	public show () : void {
		this.visible.next(true);
	}

	constructor () {
		super();
	}
}
