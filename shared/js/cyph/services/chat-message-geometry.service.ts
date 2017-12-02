import {Injectable} from '@angular/core';
import {ViewBase} from 'tns-core-modules/ui/core/view-base';
import {IChatMessage, IChatMessageDimensions} from '../proto';


/**
 * Angular service for chat message geometry.
 */
@Injectable()
export class ChatMessageGeometryService {
	/** Calculates the dimensions of a chat message at its maximum potential width. */
	public async getDimensions (message: IChatMessage) : Promise<IChatMessageDimensions> {
		throw new Error(
			'Must provide an implementation of ChatMessageGeometryService.getDimensions.'
		);
	}

	/** Calculates the height of a chat message for virtual scrolling. */
	public getHeight (dimensions: IChatMessageDimensions, maxWidth: number) : number {
		throw new Error(
			'Must provide an implementation of ChatMessageGeometryService.getHeight.'
		);
	}

	/** Calculates max message width for current UI and screen size. */
	public getMaxWidth (messageList: HTMLElement|ViewBase) : number {
		throw new Error(
			'Must provide an implementation of ChatMessageGeometryService.getMaxWidth.'
		);
	}

	constructor () {}
}
