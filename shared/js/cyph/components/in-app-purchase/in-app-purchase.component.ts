import {
	ChangeDetectionStrategy,
	Component,
	Input,
	ViewChild
} from '@angular/core';
import {FormControl} from '@angular/forms';
import {BaseProvider} from '../../base-provider';
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
export class InAppPurchaseComponent extends BaseProvider {
	/** Checkout component instance used for in-app purchases. */
	@ViewChild(CheckoutComponent)
	public checkoutComponent?: CheckoutComponent;

	/** @see CheckoutComponent.inviteCode */
	@Input() public inviteCode?: MaybePromise<string>;

	/** Form control to set purchased invite code value at, if applicable. */
	@Input() public inviteCodeFormControl?: FormControl;

	/** @see CheckoutComponent.userToken */
	@Input() public userToken?: boolean | MaybePromise<string>;

	constructor (
		/** @see AccountService */
		public readonly AccountService: AccountService,

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
