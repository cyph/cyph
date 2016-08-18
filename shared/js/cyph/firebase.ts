import {Env} from 'env';
import {EventManager} from 'eventmanager';
import {Util} from 'util';


/**
 * Wraps the Firebase SDK in a sandboxed iframe.
 */
export class Firebase {
	private static eventPrefix: string		= 'firebase';
	private static origin: string			= Env.baseUrl.slice(0, -1);
	private static frameMessageQueue: any[]	= [];

	private static frame: HTMLIFrameElement;
	private static frameIsReady: boolean;

	/**
	 * Performs dynamic RPC call to Firebase frame.
	 * @param command
	 * @param noPreprocessing Ignore this (used internally for cross-thread events).
	 * @param thenFunction Ignore this (used internally for cross-thread events).
	 */
	public static call (
		command: any,
		noPreprocessing?: boolean,
		thenFunction?: (data: string) => string
	) : Promise<string> {
		const promise	= new Promise(resolve => {
			if (!noPreprocessing) {
				let step	= command;

				if (command && command.returnValue) {
					step	= command.returnValue.command;
				}

				while (step) {
					if (step.args) {
						step.args.forEach((arg: any, i: number) => {
							if (typeof arg === 'function') {
								const callbackId: string	= Util.generateGuid();

								step.args[i]	= {callbackId};

								EventManager.on(
									Firebase.eventPrefix + callbackId,
									args => arg.apply(null, args)
								);
							}
						});
					}

					step	= step[Object.keys(step).filter(
						k => k !== 'args' && k !== 'method'
					)[0]];
				}
			}

			if (!Env.isMainThread) {
				EventManager.callMainThread('Cyph.Firebase.call', [command, true, data => resolve(data)]);
			}
			else {
				Firebase.frameMessageQueue.push({
					command,
					id: Util.generateGuid(),
					returnValueCallbackId: (() => {
						const callbackId: string	= Util.generateGuid();

						EventManager.one(
							Firebase.eventPrefix + callbackId,
							args => resolve(args[0])
						);

						return callbackId;
					})()
				});
			}
		});

		if (thenFunction) {
			return promise.then(thenFunction);
		}

		return promise;
	}

	private static _	= (() => {
		if (Env.isMainThread) {
			Firebase.frame			= document.createElement('iframe');
			Firebase.frame.sandbox	= <any> 'allow-scripts allow-same-origin';
			Firebase.frame.src		= Env.baseUrl + 'firebasesandbox#' + Env.firebaseEndpoint;

			Firebase.frame.style.display	= 'none';

			document.body.appendChild(Firebase.frame);

			$(() =>
				$(Firebase.frame).load(() =>
					setTimeout(() => {
						Firebase.frameIsReady	= true;

						setInterval(() => {
							try {
								Firebase.frame.contentWindow.postMessage(
									{messages: Firebase.frameMessageQueue},
									'*'
								);
							}
							catch (_) {}
						}, 500);
					}, 250)
				)
			);

			self.addEventListener('message', e => {
				if (e.origin === Firebase.origin && e.data.callbackId) {
					EventManager.trigger(
						Firebase.eventPrefix + e.data.callbackId,
						e.data.args
					);
				}
			});
		}
	})();
}
