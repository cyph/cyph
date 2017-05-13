import {Injectable} from '@angular/core';


/**
 * Title implementation for NativeScript (currently noops everything).
 */
@Injectable()
export class NativeTitleService {
	/** Returns empty string. */
	public getTitle () : string {
		return '';
	}

	/** Does nothing. */
	public setTitle (_NEW_TITLE: string) : void {}

	constructor () {}
}
