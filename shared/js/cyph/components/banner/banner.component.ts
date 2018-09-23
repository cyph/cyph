import {Component} from '@angular/core';
import {AppService} from '../../../cyph.com/app.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for Cyph banner
 */
@Component({
	selector: 'cyph-banner',
	styleUrls: ['./banner.component.scss'],
	templateUrl: './banner.component.html'
})
export class BannerComponent {
	constructor (
		/** @see AppService */
		public readonly appService: AppService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
