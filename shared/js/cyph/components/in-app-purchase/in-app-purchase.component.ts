import {
	ChangeDetectionStrategy,
	Component,
	Input,
	ViewChild
} from '@angular/core';
import {FormControl} from '@angular/forms';
import {BaseProvider} from '../../base-provider';
import {IInAppPurchaseComponent} from '../../checkout/iin-app-purchasecomponent';
import {CheckoutComponent} from '../../components/checkout';
import {MaybePromise} from '../../maybe-promise-type';
import {AccountService} from '../../services/account.service';
import {ConfigService} from '../../services/config.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for in-app purchases.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-in-app-purchase',
	styleUrls: ['./in-app-purchase.component.scss'],
	templateUrl: './in-app-purchase.component.html'
})
export class InAppPurchaseComponent extends BaseProvider
	implements IInAppPurchaseComponent {
	/** @inheritDoc */
	@ViewChild('checkoutComponent', {read: CheckoutComponent})
	public checkoutComponent?: CheckoutComponent;

	/** @inheritDoc */
	@Input() public inviteCode?: MaybePromise<string>;

	/** @inheritDoc */
	@Input() public inviteCodeFormControl?: FormControl;

	/** @inheritDoc */
	@Input() public userToken?: boolean | MaybePromise<string | undefined>;

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see ConfigService */
		public readonly configService: ConfigService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
