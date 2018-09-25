import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../../cyph/base-provider';
import {currencyMask} from '../../../cyph/currency-mask';
import {emailPattern} from '../../../cyph/email-pattern';
import {ConfigService} from '../../../cyph/services/config.service';
import {EnvService} from '../../../cyph/services/env.service';
import {SignupService} from '../../../cyph/services/signup.service';
import {StringsService} from '../../../cyph/services/strings.service';
import {toFloat} from '../../../cyph/util/formatting';
import {AppService} from '../../app.service';
import {DemoService} from '../../demo.service';
import {Promos, States} from '../../enums';


/**
 * Angular component for Cyph home page.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-app',
	templateUrl: './app.component.html'
})
export class AppComponent extends BaseProvider {
	/** @see currencyMask */
	public readonly currencyMask	= currencyMask;

	/** @see emailPattern */
	public readonly emailPattern	= emailPattern;

	/** @see Promos */
	public readonly promos			= Promos;

	/** @see States */
	public readonly states			= States;

	/** @see toFloat */
	public readonly toFloat			= toFloat;

	constructor (
		/** @see AppService */
		public readonly appService: AppService,

		/** @see ConfigService */
		public readonly configService: ConfigService,

		/** @see DemoService */
		public readonly demoService: DemoService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see SignupService */
		public readonly signupService: SignupService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
