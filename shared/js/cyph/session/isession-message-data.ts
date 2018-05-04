import {Observable} from 'rxjs';
import {ISessionMessageData as ISessionMessageDataInternal} from '../proto';


export interface ISessionMessageData extends ISessionMessageDataInternal {
	/** Author of this message. */
	readonly author: Observable<string>;
}
