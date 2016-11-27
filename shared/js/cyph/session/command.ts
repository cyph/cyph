/**
 * Contains an RPC call for a specific method.
 */
export class Command {
	constructor (
		/** Method identifier. */
		public readonly method: string = '',

		/** Argument to pass to method. */
		public readonly argument: any = ''
	) {}
}
