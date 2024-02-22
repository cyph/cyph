import type {FormControl} from '@angular/forms';
import type {BehaviorSubject} from 'rxjs';
import type {CheckoutComponent} from '../components/checkout';
import type {MaybePromise} from '../maybe-promise-type';

/** Interface of InAppPurchaseComponent consumed by SalesService. */
export interface IInAppPurchaseComponent {
	/** Checkout component instance used for in-app purchases. */
	checkoutComponent?: CheckoutComponent;

	/** @see CheckoutComponent.inviteCode */
	inviteCode?: MaybePromise<string>;

	/** Form control to set purchased invite code value at, if applicable. */
	inviteCodeFormControl?: FormControl;

	/** @see CheckoutComponent.spinner */
	spinner?: BehaviorSubject<boolean>;

	/** @see CheckoutComponent.userToken */
	userToken?: boolean | MaybePromise<string | undefined>;
}
