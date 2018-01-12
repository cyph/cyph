import {Observable} from 'rxjs/Observable';


/** A basic asynchronous type. */
export type Async<T>	= T|Observable<T>|Promise<T>;
