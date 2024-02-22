import type {RangeStatic} from 'quill';

/** Quill range. */
export interface IQuillRange extends RangeStatic {
	/** The originating client's unique ID. */
	clientID?: string;
}
