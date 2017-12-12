import {IQuillDelta} from '../iquill-delta';
import {IForm} from '../proto';


/** @inheritDoc */
export interface IChatMessageLiveValue {
	/** @see IChatMessageValue.form */
	form?: IForm;

	/** @see IChatMessageValue.quill */
	quill?: IQuillDelta;

	/** @see IChatMessageValue.text */
	text?: string;
}
