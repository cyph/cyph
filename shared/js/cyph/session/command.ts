namespace Cyph {
	export namespace Session {
		/**
		 * Contains an RPC call for a specific method.
		 */
		export class Command {
			/**
			 * @param method
			 * @param argument
			 */
			public constructor (
				public method: string = '',
				public argument: any = ''
			) {}
		}
	}
}
