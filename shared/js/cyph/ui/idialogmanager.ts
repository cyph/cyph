module Cyph {
	export module UI {
		export interface IDialogManager {
			alert (
				o: {
					title: string;
					content: string;
					ok: string;
				},
				callback?: (promiseValue: any) => void
			) : void;

			baseDialog (
				o: {
					template: string;
					vars?: any;
					oncomplete?: Function;
				},
				callback?: (ok: boolean, vars: any) => void
			) : void;

			confirm (
				o: {
					title: string;
					content: string;
					ok: string;
					cancel: string;
					timeout?: number;
				},
				callback?: (ok: boolean) => void
			) : void;

			toast (
				o: {
					content: string;
					position: string;
					delay: number;
				},
				callback?: () => void
			) : void;
		}
	}
}
