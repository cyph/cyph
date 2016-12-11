import {IChannel} from './ichannel';


/**
 * Bidirectional channel that sends and receives
 * locally, without hitting the network.
 */
export class LocalChannel implements IChannel {
	/** @ignore */
	private other: LocalChannel;

	/** @inheritDoc */
	public close () : void {
		const other: LocalChannel	= this.other;
		this.other	= null;

		if (!other) {
			return;
		}

		other.close();

		if (this.handlers.onClose) {
			this.handlers.onClose();
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

		const isAlice: boolean	= !this.other.isAlive();

		this.other.connect(this);

		if (this.handlers.onOpen) {
			this.handlers.onOpen(isAlice);
		}

		if (this.handlers.onConnect) {
			this.handlers.onConnect();
		}
	}

	/** @inheritDoc */
	public isAlive () : boolean {
		return !!this.other;
	}

	/** @inheritDoc */
	public send (message: string) : void {
		if (!this.other || !this.other.handlers.onMessage) {
			return;
		}

		this.other.handlers.onMessage(message);
	}

	/**
	 * @param handlers Event handlers for this channel.
	 */
	constructor (
		public readonly handlers: ({
			onClose?: () => void;
			onConnect?: () => void;
			onMessage?: (message: string) => void;
			onOpen?: (isAlice: boolean) => void;
		}) = {}
	) {}
}
