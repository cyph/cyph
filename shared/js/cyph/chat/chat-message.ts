import {IChatMessage} from '../../proto';
import {Timer} from '../timer';
import {util} from '../util';


/** @inheritDoc */
export class ChatMessage implements IChatMessage {
	/** @inheritDoc */
	public get author () : string {
		return this.message.author;
	}

	/** @inheritDoc */
	public get id () : string {
		return this.message.id;
	}

	/** @inheritDoc */
	public readonly selfDestructTimer?: Timer;

	/** @inheritDoc */
	public get selfDestructTimeout () : number|undefined {
		return this.message.selfDestructTimeout;
	}

	/** @inheritDoc */
	public get text () : string {
		return this.message.text;
	}

	/** @inheritDoc */
	public get timestamp () : number {
		return this.message.timestamp;
	}

	/** @inheritDoc */
	public readonly timeString: string	= util.getTimeString(this.message.timestamp);

	constructor (
		/** @ignore */
		private readonly message: IChatMessage
	) {
		if (
			this.message.selfDestructTimeout === undefined ||
			isNaN(this.message.selfDestructTimeout) ||
			this.message.selfDestructTimeout < 1
		) {
			return;
		}

		this.selfDestructTimer	= new Timer(this.message.selfDestructTimeout);

		this.selfDestructTimer.start().then(async () => {
			await util.sleep(10000);
			this.message.text	= '';
		});
	}
}
