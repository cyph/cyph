import {combineLatest, ObservableInput, of} from 'rxjs';


/** combineLatest wrapper that emits regardless of whether input is empty. */
export const observableAll	= <T> (observables?: ObservableInput<T>[]) =>
	observables && observables.length > 0 ? combineLatest(observables) : of([])
;
