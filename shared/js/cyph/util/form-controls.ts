import {FormControl} from '@angular/forms';
import memoize from 'lodash-es/memoize';
import {concat, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {safeStringCompare} from './compare';
import {observableAll} from './observable-all';

/** Creates a form control that has to match a specified value. */
export const formControlMatch = (
	o: {value: string},
	initialValue: string = ''
) =>
	new FormControl(initialValue, [
		control =>
			!safeStringCompare(control.value, o.value) ?
				{mismatch: true} :
				/* eslint-disable-next-line no-null/no-null */
				null
	]);

/** Observes a form control. */
export const watchFormControl = memoize((control: FormControl) =>
	concat(
		of(control),
		observableAll([control.statusChanges, control.valueChanges]).pipe(
			map(() => control)
		)
	)
);
