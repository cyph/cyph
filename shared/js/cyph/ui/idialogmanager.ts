/// <reference path="../../global/base.ts" />


module Cyph {
	export module UI {
		export interface IDialogManager {
			alert (
				o: {
					title: string;
					content: string;
					ok: string;
				},
				callback?: (promiseValue: any) => {}
			) : void;

			baseDialog (
				o: {
					template: string;
					vars?: any;
					oncomplete?: Function;
				},
				callback?: (ok: boolean, vars: any) => {}
			) : void;

			confirm (
				o: {
					title: string;
					content: string;
					ok: string;
					cancel: string;
					timeout?: number;
				},
				callback?: (ok: boolean) => {}
			) : void;

			toast (o: {
				content: string;
				position: string;
				delay: number;
			}) : void;
		}
	}
}
