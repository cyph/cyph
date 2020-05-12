import {combineLatest, ObservableInput, of} from 'rxjs';

/** combineLatest wrapper that emits regardless of whether input is empty. */
export const observableAll: typeof combineLatest = <any> (<T>(
	observables?: ObservableInput<T>[]
) =>
	observables && observables.length > 0 ?
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		combineLatest(observables) :
		of([]));
