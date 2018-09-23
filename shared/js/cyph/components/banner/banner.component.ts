import {Component, EventEmitter, Output} from '@angular/core';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for Cyph banner.
 */
@Component({
	selector: 'cyph-banner',
	styleUrls: ['./banner.component.scss'],
	templateUrl: './banner.component.html'
})
export class BannerComponent {
	/** Close event. */
	@Output() public readonly close	= new EventEmitter<void>();

	constructor (
		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
