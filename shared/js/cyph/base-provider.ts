import {OnDestroy} from '@angular/core';
import {Subscription} from 'rxjs';


/** Provider base class with common behavior. */
export class BaseProvider implements OnDestroy {
	/** Indicates whether this is destroyed. */
	public destroyed: boolean	= false;

	/** Active subscriptions in use by this component. */
	public readonly subscriptions: Subscription[]	= [];

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.destroyed	= true;

		for (const subsciption of this.subscriptions.splice(0, this.subscriptions.length)) {
			subsciption.unsubscribe();
		}
	}
}
