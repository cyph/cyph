import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	Output
} from '@angular/core';
import {BaseProvider} from '../../base-provider';

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
	/** Share prompt description. */
	@Input() public description: string = '';

	/** Share prompt hash tags. */
	@Input() public hashTags: string[] = [];

	/** @see ShareButtons.opened */
	@Output() public readonly opened = new EventEmitter<void>();

	/** Share prompt title. */
	@Input() public title: string = '';

	/** Share prompt URL. */
	@Input() public url: string = '';

	/** @see ShareButtons.tags */
	public get tags () : string {
		return this.hashTags.join(',');
	}

	constructor (
		/** @see ChangeDetectorRef */
		public readonly changeDetectorRef: ChangeDetectorRef
	) {
		super();
	}
}
