import {Env} from 'env';
import {EventManager} from 'eventmanager';
import {Thread} from 'thread';
import {Util} from 'util';


/**
 * Wraps the Firebase SDK in a sandboxed iframe.
 */
export class Firebase {
	private static eventPrefix: string	= 'firebase';
	private static origin: string		= Env.baseUrl.slice(0, -1);

	private static frame: HTMLIFrameElement;
	private static frameIsReady: boolean;

	/**
	 * Performs dynamic RPC call to Firebase frame.
	 * @param command
	 */
	public static call (command: any) : void {
		if (!Env.isMainThread) {
			Thread.callMainThread('Cyph.Firebase.call', [command]);
		}
		else if (Firebase.frameIsReady) {
			let step	= command;

			while (step) {
				if (step.args) {
					step.args.forEach((arg: any, i: number) => {
						if (typeof arg === 'function') {
							const callbackId: string	= Util.generateGuid();

							step.args[i]	= {callbackId};

							EventManager.on(
								Firebase.eventPrefix + callbackId,
								data => arg.apply(null, data)
							);
						}
					});
				}

				step	= step[Object.keys(step).filter(
					k => k !== 'args' && k !== 'method'
				)[0]];
			}

			try {
				Firebase.frame.contentWindow.postMessage({
					command,
					id: Util.generateGuid()
				}, '*');
			}
			catch (_) {}
		}
		else {
			setTimeout(() => Firebase.call(command), 50);
		}
	}

	private static _	= (() => {
		if (Env.isMainThread) {
			Firebase.frame			= document.createElement('iframe');
			Firebase.frame.sandbox	= <any> 'allow-scripts allow-same-origin';
			Firebase.frame.src		= Env.baseUrl + 'firebasesandbox';

			Firebase.frame.style.display	= 'none';

			document.body.appendChild(Firebase.frame);

			$(() =>
				$(Firebase.frame).load(() =>
					setTimeout(() => {
						Firebase.frameIsReady	= true;
					}, 250)
				)
			);

			self.addEventListener('message', e => {
				if (e.origin === Firebase.origin) {
					EventManager.trigger(
						Firebase.eventPrefix + e.data.callbackId,
						e.data.args
					);
				}
			});
		}
	})();
}
