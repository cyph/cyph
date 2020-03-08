import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	OnChanges,
	Output
} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
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
export class SocialShareComponent extends BaseProvider implements OnChanges {
	/** Share prompt close event. */
	@Output() public readonly close = new EventEmitter<void>();

	/** Share prompt options. */
	@Input() public options?: {
		hashTags?: string[];
		text: string;
		url: string;
	};

	/** Processed share prompt options. */
	public readonly shareOptions = new BehaviorSubject<any>({});

	/** Indicates whether or not share prompt is visible. */
	public readonly visible = new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public ngOnChanges () : void {
		if (!this.options) {
			this.shareOptions.next({});
			return;
		}

		const options = {
			socialShareHashtags: this.options.hashTags,
			socialShareText: this.options.text,
			socialShareUrl: this.options.url
		};

		this.shareOptions.next({
			displayNames: true,
			config: [
				{
					facebook: {
						...options,
						socialSharePopupHeight: 400,
						socialSharePopupWidth: 400
					}
				},
				{
					twitter: {
						...options,
						socialSharePopupHeight: 400,
						socialSharePopupWidth: 300
					}
				},
				{
					reddit: {
						...options,
						socialSharePopupHeight: 500,
						socialSharePopupWidth: 300
					}
				},
				{
					hackernews: options
				},
				{
					linkedin: options
				},
				{
					pinterest: options
				},
				{
					whatsapp: options
				},
				{
					email: options
				},
				{
					copy: options
				}
			]
		});
	}

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
