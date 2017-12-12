import {DeltaOperation} from 'quill';


export interface IQuillDelta {
	/** The originating client's unique ID. */
	clientID?: string;

	/* @see DeltaStatic.ops */
	ops?: DeltaOperation[];
}
