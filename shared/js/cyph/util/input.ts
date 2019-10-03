import {env} from '../env';

/** Dismisses open virtual keyboard if applicable. */
export const dismissKeyboard = () => {
	if (
		env.isWeb &&
		env.isMobileOS &&
		document.activeElement instanceof HTMLElement &&
		document.activeElement !== document.body
	) {
		document.activeElement.blur();
	}
};

/** Simulates a click on elem. */
export const triggerClick = (elem: HTMLElement) : void => {
	if (!env.isWeb) {
		/* TODO: HANDLE NATIVE */
		return;
	}

	const e: Event = document.createEvent('MouseEvents');
	e.initEvent('click', true, false);
	elem.dispatchEvent(e);
};
