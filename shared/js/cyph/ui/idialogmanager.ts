/// <reference path="../../global/base.ts" />


module Cyph {
	export module UI {
		export interface IDialogManager {
			alert (o: any, callback?: Function) : void;

			baseDialog (o: any, callback?: Function) : void;

			confirm (o: any, callback?: Function, timeout?: number) : void;

			toast (o: any, callback?: Function) : void;
		}
	}
}
