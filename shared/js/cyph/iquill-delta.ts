import {DeltaOperation} from 'quill';
import {Op} from 'quill-delta';

/** Quill delta. */
export interface IQuillDelta {
	/** The originating client's unique ID. */
	clientID?: string;

	/** @see Delta.ops */
	ops?: (DeltaOperation | Op)[];
}
