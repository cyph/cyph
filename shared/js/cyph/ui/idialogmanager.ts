/**
 * Represents modal/dialog functionality.
 * @interface
 */
export interface IDialogManager {
	/**
	 * Displays alert.
	 * @param o
	 */
	alert (
		o: {
			title: string;
			content: string;
			ok: string;
		}
	) : Promise<any>;

	/**
	 * Generic modal implementation that takes a template / content.
	 * @param o
	 */
	baseDialog (
		o: {
			template: string;
			locals?: any;
			oncomplete?: Function;
			onclose?: Function;
		}
	) : Promise<{ok: boolean; locals: any;}>;

	/**
	 * Displays interactive confirmation prompt.
	 * @param o
	 */
	confirm (
		o: {
			title: string;
			content: string;
			ok: string;
			cancel: string;
			timeout?: number;
		}
	) : Promise<boolean>;

	/**
	 * Displays toast notification.
	 * @param o
	 */
	toast (
		o: {
			content: string;
			delay: number;
			position?: string;
		}
	) : Promise<void>;
}
