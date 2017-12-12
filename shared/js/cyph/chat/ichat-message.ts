import {IChatMessage as IChatMessageInternal} from '../proto';
import {IChatMessageValue} from './ichat-message-value';


/** @inheritDoc */
export interface IChatMessage extends IChatMessageInternal {
	/** @inheritDoc */
	value?: IChatMessageValue;
}
