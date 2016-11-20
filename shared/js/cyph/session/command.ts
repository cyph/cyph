/**
 * Contains an RPC call for a specific method.
 */
export class Command {
	/**
	 * @param method
	 * @param argument
	 */
	constructor (
		public method: string = '',
		public argument: any = ''
	) {}
}
