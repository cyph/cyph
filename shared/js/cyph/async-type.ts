import {Observable} from 'rxjs';


/** A basic asynchronous type. */
export type Async<T>	= T|Observable<T>|Promise<T>;
