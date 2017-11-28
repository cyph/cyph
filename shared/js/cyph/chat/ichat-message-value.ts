import {IQuillDelta} from '../iquill-delta';
import {IChatMessageValue as IChatMessageValueInternal} from '../proto';


/** @inheritDoc */
export interface IChatMessageValue extends IChatMessageValueInternal {
	/** quillDeltaBytes decoded. */
	quillDelta?: IQuillDelta;
}
