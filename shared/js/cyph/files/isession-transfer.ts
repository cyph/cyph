import {Observable} from 'rxjs';
import {ISessionTransfer as ISessionTransferInternal} from '../proto';


export interface ISessionTransfer extends ISessionTransferInternal {
	/** Author of this message. */
	readonly author: Observable<string>;
}
