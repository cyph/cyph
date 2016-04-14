import {IChannel} from 'ichannel';


/**
 * Bidirectional channel that sends and receives
 * locally, without hitting the network.
 */
export class LocalChannel implements IChannel {
	private other: LocalChannel;

	public close (callback?: Function) : void {
		const other: LocalChannel	= this.other;
		this.other	= null;

		if (other) {
			other.close();

			if (callback) {
				callback();
			}

			if (this.handlers.onclose) {
				this.handlers.onclose(null, null);
			}
		}
	}

	/**
	 * Initiates bidirectional connection between this and
	 * another LocalChannel instance.
	 * @param other
	 */
	public connect (other: LocalChannel) : void {
		if (!this.other) {
			this.other	= other;

			const isCreator: boolean	= !this.other.isAlive();

			this.other.connect(this);

			if (this.handlers.onopen) {
				this.handlers.onopen(isCreator);
			}

			if (this.handlers.onconnect) {
				this.handlers.onconnect();
			}
		}
	}

	public isAlive () : boolean {
		return !!this.other;
	}

	public receive (
		messageHandler?: (message: string) => void,
		onComplete?: Function,
		maxNumberOfMessages?: number,
		waitTimeSeconds?: number,
		onLag?: Function
	) : void {}

	public send (
		message: string|string[],
		callback?: Function|Function[],
		isSynchronous?: boolean
	) : void {
		if (this.other && this.other.handlers.onmessage) {
			(typeof message === 'string' ? [message] : message).forEach((s: string) =>
				setTimeout(() => this.other.handlers.onmessage(s), 0)
			);
		}

		(
			<Function[]>
			(!callback ? [] : callback instanceof Array ? callback : [callback])
		).forEach((f: Function) =>
			setTimeout(() => f(), 0)
		);
	}

	/**
	 * @param handlers Event handlers for this channel.
	 */
	public constructor (
		public handlers: ({
			onclose?: (err: any, data: any) => void;
			onconnect?: () => void;
			onmessage?: (message: string) => void;
			onopen?: (isCreator: boolean) => void;
		}) = {}
	) {}
}
