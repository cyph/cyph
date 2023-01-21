import {AsyncPipe} from '@angular/common';
import {ChangeDetectorRef, OnDestroy, Pipe, PipeTransform} from '@angular/core';
import {Observable, Subscribable} from 'rxjs';
import {Async} from '../async-type';

/** Replaces the built-in AsyncPipe's "empty" value of null with undefined. */
@Pipe({
	name: 'await',
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	pure: false
})
export class AwaitPipe implements OnDestroy, PipeTransform {
	/** @see AsyncPipe */
	private readonly asyncPipe: AsyncPipe;

	/** @inheritDoc */
	public ngOnDestroy () : void {
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		this.asyncPipe.ngOnDestroy();
	}

	/** @inheritDoc */
	/* eslint-disable-next-line no-null/no-null */
	public transform<T> (
		obj: Async<T | undefined | null> | Subscribable<T | undefined | null>
	) : T | undefined {
		const retVal =
			obj instanceof Promise ||
			obj instanceof Observable ||
			/* eslint-disable-next-line eqeqeq, no-null/no-null */
			(typeof obj === 'object' && obj != null && 'subscribe' in obj) ?
				this.asyncPipe.transform(obj) :
				obj;

		/* eslint-disable-next-line no-null/no-null */
		return retVal === null ? undefined : retVal;
	}

	constructor (changeDetectorRef: ChangeDetectorRef) {
		this.asyncPipe = new AsyncPipe(changeDetectorRef);
	}
}
