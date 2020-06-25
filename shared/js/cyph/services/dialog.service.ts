/* eslint-disable @typescript-eslint/require-await */

import {ComponentType} from '@angular/cdk/portal';
import {ChangeDetectorRef, Injectable} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {Async} from '../async-type';
import {BaseProvider} from '../base-provider';
import {IResolvable} from '../iresolvable';
import {MaybePromise} from '../maybe-promise-type';
import {IForm} from '../proto/types';

/**
 * Provides modal/dialog functionality.
 */
@Injectable()
export class DialogService extends BaseProvider {
	/** Displays alert. */
	public async alert (
		_O: {
			content: string;
			image?: SafeUrl;
			markdown?: boolean;
			ok?: string;
			title?: string;
		},
		_CLOSE_FUNCTION?: IResolvable<() => void>,
		_AFTER_OPENED?: IResolvable<void>
	) : Promise<void> {
		throw new Error(
			'Must provide an implementation of DialogService.alert.'
		);
	}

	/** Generic modal implementation that takes a template / content. */
	public async baseDialog<T extends {changeDetectorRef: ChangeDetectorRef}> (
		_COMPONENT_TYPE: ComponentType<T>,
		_SET_INPUTS?: (componentInstance: T) => MaybePromise<void>,
		_CLOSE_FUNCTION?: IResolvable<() => void>,
		_BOTTOM_SHEET?: boolean,
		_OPTIONS?: {
			large?: boolean;
			lightTheme?: boolean;
		}
	) : Promise<void> {
		throw new Error(
			'Must provide an implementation of DialogService.baseDialog.'
		);
	}

	/** Displays interactive confirmation prompt. */
	public async confirm (
		_O: {
			bottomSheet?: boolean;
			cancel?: string;
			cancelFAB?: string;
			content: string;
			fabAvatar?: Async<SafeUrl | string>;
			markdown?: boolean;
			ok?: string;
			okFAB?: string;
			timeout?: number;
			timeoutMessage?: string;
			title: string;
		},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<boolean> {
		throw new Error(
			'Must provide an implementation of DialogService.confirm.'
		);
	}

	/** Allows a user to crop an image and returns the result. */
	public async cropImage (_O: {
		aspectRatio?: number;
		src: SafeUrl | string;
		title?: string;
	}) : Promise<SafeUrl | undefined> {
		throw new Error(
			'Must provide an implementation of DialogService.cropImage.'
		);
	}

	/** If applicable, dismisses active toast. */
	public async dismissToast () : Promise<void> {
		throw new Error(
			'Must provide an implementation of DialogService.dismissToast.'
		);
	}

	/** Displays multimedia. Default mediaType is image/png. */
	public async media (
		_O: {mediaType?: string; src: SafeUrl | string; title?: string},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<void> {
		throw new Error(
			'Must provide an implementation of DialogService.media.'
		);
	}

	/** Prompts for input. */
	public async prompt (
		_O: {
			bottomSheet?: boolean;
			cancel?: string;
			content: string;
			form: IForm;
			ok?: string;
			password?: boolean;
			placeholder?: string;
			preFill?: string;
			timeout?: number;
			timeoutMessage?: string;
			title: string;
		},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<IForm | undefined>;
	public async prompt (
		_O: {
			bottomSheet?: boolean;
			multipleChoiceOptions: {
				text?: string;
				title: string;
				value: any;
			}[];
			timeout?: number;
			timeoutMessage?: string;
			title: string;
		},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<any | undefined>;
	public async prompt (
		_O: {
			bottomSheet?: boolean;
			cancel?: string;
			content: string;
			ok?: string;
			password?: boolean;
			placeholder?: string;
			preFill?: string;
			timeout?: number;
			timeoutMessage?: string;
			title: string;
		},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<string | undefined>;
	public async prompt (
		_O: {
			bottomSheet?: boolean;
			cancel?: string;
			content?: string;
			form?: IForm;
			multipleChoiceOptions?: {
				text?: string;
				title: string;
				value: any;
			}[];
			ok?: string;
			password?: boolean;
			placeholder?: string;
			preFill?: string;
			timeout?: number;
			timeoutMessage?: string;
			title: string;
		},
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<string | IForm | undefined> {
		throw new Error(
			'Must provide an implementation of DialogService.prompt.'
		);
	}

	/**
	 * Displays toast notification.
	 * @returns Whether it was manually dismissed.
	 */
	public async toast (
		_CONTENT: string,
		_DURATION?: number,
		_ACTION?: string,
		_CLOSE_FUNCTION?: IResolvable<() => void>
	) : Promise<boolean> {
		throw new Error(
			'Must provide an implementation of DialogService.toast.'
		);
	}

	constructor () {
		super();
	}
}
