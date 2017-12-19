import {IQuillDelta} from '../iquill-delta';
import {ICalendarInvite, IForm} from '../proto';


/** @inheritDoc */
export interface IChatMessageLiveValue {
	/** @see IChatMessageValue.calendarInvite */
	calendarInvite?: ICalendarInvite;

	/** @see IChatMessageValue.form */
	form?: IForm;

	/** @see IChatMessageValue.quill */
	quill?: IQuillDelta;

	/** @see IChatMessageValue.text */
	text?: string;
}
