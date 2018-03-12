import {ComponentType} from '@angular/cdk/portal';
import {Injectable} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {IResolvable} from '../iresolvable';


/**
 * Provides modal/dialog functionality.
 */
@Injectable()
export class DialogService {
	/** Displays alert. */
	public async alert (
		_O: {content: string; ok?: string; title?: string},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<void> {
		throw new Error('Must provide an implementation of DialogService.alert.');
	}

	/** Generic modal implementation that takes a template / content. */
	public async baseDialog<T> (
		_COMPONENT_TYPE: ComponentType<T>,
		_SET_INPUTS?: (componentInstance: T) => void,
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<void> {
		throw new Error('Must provide an implementation of DialogService.baseDialog.');
	}

	/** Displays interactive confirmation prompt. */
	public async confirm (
		_O: {
			cancel?: string;
			content: string;
			ok?: string;
			timeout?: number;
			title: string;
		},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<boolean> {
		throw new Error('Must provide an implementation of DialogService.confirm.');
	}

	/** If applicable, dismisses active toast. */
	public async dismissToast () : Promise<void> {
		throw new Error('Must provide an implementation of DialogService.dismissToast.');
	}

	/** Displays image. */
	public async image (
		_SRC: SafeUrl|string,
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<void> {
		throw new Error('Must provide an implementation of DialogService.image.');
	}

	/**
	 * Displays toast notification.
	 * @returns Whether it was manually dismissed.
	 */
	public async toast (_CONTENT: string, _DURATION: number, _ACTION?: string) : Promise<boolean> {
		throw new Error('Must provide an implementation of DialogService.toast.');
	}

	constructor () {}
}
