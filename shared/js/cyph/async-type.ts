import {Observable} from 'rxjs/Observable';


/** A basic asynchronous type. */
export type Async<T>	= Observable<T>|Promise<T>;
