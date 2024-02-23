import Granim from 'granim';
import {env} from './env';
import {waitForIterable} from './util/wait';

/**
 * Initializes Granim.
 * @returns Granim instance if possible in the current environment, otherwise undefined.
 */
export const initGranim = async (
	opts: Record<string, any>
) : Promise<
	| undefined
	| {
			changeState: (state: string) => void;
			clear: () => void;
			pause: () => void;
			play: () => void;
	  }
> => {
	if (!env.isWeb) {
		return;
	}

	const selector = opts.element;

	if (typeof selector !== 'string' || selector.length < 1) {
		throw new Error('Missing Granim selector.');
	}

	const elem = (
		await waitForIterable(() => document.querySelectorAll(selector))
	)[0];

	const started = new Promise<void>(resolve => {
		const event = 'granim:start';

		if (!elem) {
			resolve();
			return;
		}

		const handler = () => {
			resolve();
			elem.removeEventListener(event, handler);
		};

		elem.addEventListener(event, handler);
	});

	const granim = new Granim(<any> opts);

	await started;

	return granim;
};
