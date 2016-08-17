import {IChannel} from 'ichannel';
import {LocalChannel} from 'localchannel';
import {Config} from 'cyph/config';
import {Timer} from 'cyph/timer';
import {Util} from 'cyph/util';
import {Events} from 'session/enums';
import {ISession} from 'session/isession';


export {
	IChannel,
	LocalChannel
};


/**
 * Standard IChannel implementation built on Firebase.
 */
export class Channel implements IChannel {
	public close (callback?: Function) : void {
		
	}

	public isAlive () : boolean {
		return true;
	}

	public receive (
		messageHandler?: (message: string) => void,
		onComplete?: Function,
		maxNumberOfMessages?: number,
		waitTimeSeconds?: number,
		onLag?: Function
	) : void {
		
	}

	public send (
		message: string|string[],
		callback?: Function|Function[],
		isSynchronous?: boolean
	) : void {
		
	}

	/**
	 * @param channelName Name of this channel.
	 * @param handlers Event handlers for this channel.
	 * @param session Optionally pass in to trigger newChannel event.
	 */
	public constructor (
		channelName: string,
		handlers: ({
			onclose?: (err: any, data: any) => void;
			onconnect?: () => void;
			onlag?: (lag: number, region: string) => void;
			onmessage?: (message: string) => void;
			onopen?: (isCreator: boolean) => void;
		}) = {},
		session?: ISession
	) {
		
	}
}
