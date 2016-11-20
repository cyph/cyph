/**
 * Contains an RPC call for a specific method.
 */
export class Command {
	constructor (
		/** Method identifier. */
		public method: string = '',

		/** Argument to pass to method. */
		public argument: any = ''
	) {}
}
