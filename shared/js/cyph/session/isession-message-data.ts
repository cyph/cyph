import type {Observable} from 'rxjs';
import type {ISessionMessageData as ISessionMessageDataInternal} from '../proto/types';

/** @inheritDoc */
export interface ISessionMessageData extends ISessionMessageDataInternal {
	/** Author of this message. */
	readonly author: Observable<string>;

	/** Indicates whether this is part of the initial message processing batch. */
	readonly initial: boolean;
}
