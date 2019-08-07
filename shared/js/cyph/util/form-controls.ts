import {FormControl} from '@angular/forms';
import memoize from 'lodash-es/memoize';
import {combineLatest, concat, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {safeStringCompare} from './compare';

/** Creates a form control that has to match a specified value. */
export const formControlMatch = (
	o: {value: string},
	initialValue: string = ''
) =>
	new FormControl(initialValue, [
		control =>
			!safeStringCompare(control.value, o.value) ?
				{mismatch: true} :
				/* tslint:disable-next-line:no-null-keyword */
				null
	]);

/** Observes a form control. */
export const watchFormControl = memoize((control: FormControl) =>
	concat(
		of(control),
		combineLatest([control.statusChanges, control.valueChanges]).pipe(
			map(() => control)
		)
	)
);
