import {Injectable} from '@angular/core';
import {BaseProvider} from './js/cyph/base-provider';

/**
 * Title implementation for NativeScript (currently noops everything).
 */
@Injectable()
export class NativeTitleService extends BaseProvider {
	/** Returns empty string. */
	public getTitle () : string {
		return '';
	}

	/** Does nothing. */
	public setTitle (_NEW_TITLE: string) : void {}

	constructor () {
		super();
	}
}
