module Cyph {
	export module Session {
		export interface IMutex {
			lock (f: Function, purpose?: string) : void;

			unlock () : void;
		}
	}
}
