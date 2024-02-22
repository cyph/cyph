import type {IQuillDelta} from '../iquill-delta';
import type {ICalendarInvite, IFileTransfer, IForm} from '../proto/types';

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
