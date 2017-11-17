import {Observable} from 'rxjs/Observable';
import {ISessionMessageData as ISessionMessageDataInternal} from '../proto';


export interface ISessionMessageData extends ISessionMessageDataInternal {
	/** Author of this message. */
	readonly author: Observable<string>;
}
