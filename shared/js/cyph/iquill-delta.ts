import {DeltaStatic} from 'quill';


export interface IQuillDelta extends DeltaStatic {
	/** The originating client's unique ID. */
	clientID: string;
}
