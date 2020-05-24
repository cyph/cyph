import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Subscription} from 'rxjs';

/** Provider base class with common behavior. */
@Injectable()
export class BaseProvider implements OnDestroy {
	/** Indicates whether this is destroyed. */
	public readonly destroyed = new BehaviorSubject<boolean>(false);

	/** Active subscriptions in use by this component. */
	public readonly subscriptions: Subscription[] = [];

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.destroyed.next(true);

		for (const subsciption of this.subscriptions.splice(
			0,
			this.subscriptions.length
		)) {
			subsciption.unsubscribe();
		}
	}
}
