import {IChannel} from 'ichannel';


/**
 * Bidirectional channel that sends and receives
 * locally, without hitting the network.
 */
export class LocalChannel implements IChannel {
	private other: LocalChannel;

	public close () : void {
		const other: LocalChannel	= this.other;
		this.other	= null;

		if (!other) {
			return;
		}

		other.close();

		if (this.handlers.onclose) {
			this.handlers.onclose();
		}
	}

	/**
	 * Initiates bidirectional connection between this and
	 * another LocalChannel instance.
	 * @param other
	 */
	public connect (other: LocalChannel) : void {
		if (this.other) {
			return;
		}

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

	public isAlive () : boolean {
		return !!this.other;
	}

	public send (message: string) : void {
		if (!this.other || !this.other.handlers.onmessage) {
			return;
		}

		this.other.handlers.onmessage(message);
	}

	/**
	 * @param handlers Event handlers for this channel.
	 */
	public constructor (
		public handlers: ({
			onclose?: () => void;
			onconnect?: () => void;
			onmessage?: (message: string) => void;
			onopen?: (isCreator: boolean) => void;
		}) = {}
	) {}
}
