import {IQuillDelta} from '../iquill-delta';
import {ICalendarInvite, IFileTransfer, IForm} from '../proto';


/** Message value for live editing. */
export interface IChatMessageLiveValue {
	/** @see IChatMessageValue.calendarInvite */
	calendarInvite?: ICalendarInvite;

	/** @see IChatMessageValue.fileTransfer */
	fileTransfer?: IFileTransfer;

	/** @see IChatMessageValue.form */
	form?: IForm;

	/** @see IChatMessageValue.quill */
	quill?: IQuillDelta;

	/** @see IChatMessageValue.text */
	text?: string;
}
