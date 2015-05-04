module Cyph {
	export module UI {
		/**
		 * Represents modal/dialog functionality.
		 * @interface
		 */
		export interface IDialogManager {
			/**
			 * Displays alert.
			 * @param o
			 * @param callback
			 */
			alert (
				o: {
					title: string;
					content: string;
					ok: string;
				},
				callback?: (promiseValue: any) => void
			) : void;

			/**
			 * Generic modal implementation that takes a template / content.
			 * @param o
			 * @param callback
			 */
			baseDialog (
				o: {
					template: string;
					vars?: any;
					oncomplete?: Function;
				},
				callback?: (ok: boolean, vars: any) => void
			) : void;

			/**
			 * Displays interactive confirmation prompt.
			 * @param o
			 * @param callback
			 */
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

			/**
			 * Displays toast notification.
			 * @param o
			 * @param callback
			 */
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
