import {ComponentType} from '@angular/cdk/portal';
import {Injectable} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {BaseProvider} from '../base-provider';
import {IResolvable} from '../iresolvable';
import {MaybePromise} from '../maybe-promise-type';
import {IForm} from '../proto';


/**
 * Provides modal/dialog functionality.
 */
@Injectable()
export class DialogService extends BaseProvider {
	/** Displays alert. */
	public async alert (
		_O: {content: string; markdown?: boolean; ok?: string; title?: string},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<void> {
		throw new Error('Must provide an implementation of DialogService.alert.');
	}

	/** Generic modal implementation that takes a template / content. */
	public async baseDialog<T> (
		_COMPONENT_TYPE: ComponentType<T>,
		_SET_INPUTS?: (componentInstance: T) => MaybePromise<void>,
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<void> {
		throw new Error('Must provide an implementation of DialogService.baseDialog.');
	}

	/** Displays interactive confirmation prompt. */
	public async confirm (
		_O: {
			cancel?: string;
			content: string;
			markdown?: boolean;
			ok?: string;
			timeout?: number;
			title: string;
		},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<boolean> {
		throw new Error('Must provide an implementation of DialogService.confirm.');
	}

	/** Allows a user to crop an image and returns the result. */
	public async cropImage (_O: {
		aspectRatio?: number;
		src: SafeUrl|string;
		title?: string;
	}) : Promise<SafeUrl|undefined> {
		throw new Error('Must provide an implementation of DialogService.cropImage.');
	}

	/** If applicable, dismisses active toast. */
	public async dismissToast () : Promise<void> {
		throw new Error('Must provide an implementation of DialogService.dismissToast.');
	}

	/** Displays multimedia. Default mediaType is image/png. */
	public async media (
		_O: {mediaType?: string; src: SafeUrl|string; title?: string},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<void> {
		throw new Error('Must provide an implementation of DialogService.media.');
	}

	/** Prompts for input. */
	public async prompt (
		_O: {
			cancel?: string;
			content: string;
			form: IForm;
			ok?: string;
			placeholder?: string;
			timeout?: number;
			title: string;
		},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<IForm|undefined>;
	public async prompt (
		_O: {
			cancel?: string;
			content: string;
			ok?: string;
			placeholder?: string;
			timeout?: number;
			title: string;
		},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<string|undefined>;
	public async prompt (
		_O: {
			cancel?: string;
			content: string;
			form?: IForm;
			ok?: string;
			placeholder?: string;
			timeout?: number;
			title: string;
		},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<string|IForm|undefined> {
		throw new Error('Must provide an implementation of DialogService.prompt.');
	}

	/**
	 * Displays toast notification.
	 * @returns Whether it was manually dismissed.
	 */
	public async toast (_CONTENT: string, _DURATION: number, _ACTION?: string) : Promise<boolean> {
		throw new Error('Must provide an implementation of DialogService.toast.');
	}

	constructor () {
		super();
	}
}
