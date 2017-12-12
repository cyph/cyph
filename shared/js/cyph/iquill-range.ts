import {RangeStatic} from 'quill';


export interface IQuillRange extends RangeStatic {
	/** The originating client's unique ID. */
	clientID?: string;
}
