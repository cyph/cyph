import {env} from '../env';


/** Simulates a click on elem. */
export const triggerClick	= (elem: HTMLElement) : void => {
	if (!env.isWeb) {
		/* TODO: HANDLE NATIVE */
		return;
	}

	const e: Event	= document.createEvent('MouseEvents');
	e.initEvent('click', true, false);
	elem.dispatchEvent(e);
};
