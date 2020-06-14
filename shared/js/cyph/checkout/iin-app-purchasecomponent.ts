import {FormControl} from '@angular/forms';
import {CheckoutComponent} from '../components/checkout';
import {MaybePromise} from '../maybe-promise-type';

/** Interface of InAppPurchaseComponent consumed by SalesService. */
export interface IInAppPurchaseComponent {
	/** Checkout component instance used for in-app purchases. */
	checkoutComponent?: CheckoutComponent;

	/** @see CheckoutComponent.inviteCode */
	inviteCode?: MaybePromise<string>;

	/** Form control to set purchased invite code value at, if applicable. */
	inviteCodeFormControl?: FormControl;

	/** @see CheckoutComponent.userToken */
	userToken?: boolean | MaybePromise<string | undefined>;
}
