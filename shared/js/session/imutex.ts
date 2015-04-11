/// <reference path="../globals.ts" />


module Session {
	export interface IMutex {
		lock (f: Function, purpose?: string) : void;

		unlock () : void;
	}
}
