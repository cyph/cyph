import {
	EventEmitter,
	Injectable,
	OnDestroy,
	OnInit,
	Output
} from '@angular/core';
import {BehaviorSubject, Subscription} from 'rxjs';

/** Provider base class with common behavior. */
@Injectable()
export class BaseProvider implements OnDestroy, OnInit {
	/** Indicates whether this is destroyed. */
	public readonly destroyed = new BehaviorSubject<boolean>(false);

	/** Lifecycle OnDestroy event. */
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	@Output() public readonly lifecycleOnDestroy = new EventEmitter<void>();

	/** Lifecycle OnInit event. */
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	@Output() public readonly lifecycleOnInit = new EventEmitter<void>();

	/** Active subscriptions in use by this component. */
	public readonly subscriptions: Subscription[] = [];

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.destroyed.next(true);
		this.lifecycleOnDestroy.emit();

		for (const subsciption of this.subscriptions.splice(
			0,
			this.subscriptions.length
		)) {
			subsciption.unsubscribe();
		}
	}

	/** @inheritDoc */
	/* eslint-disable-next-line @angular-eslint/contextual-lifecycle */
	public ngOnInit () : void {
		this.lifecycleOnInit.emit();
	}
}
