import {Injectable} from '@angular/core';
import {ComponentType} from '@angular/material';


/**
 * Provides modal/dialog functionality.
 */
@Injectable()
export class DialogService {
	/** Displays alert. */
	public async alert (_O: {content: string; ok: string; title: string}) : Promise<void> {
		throw new Error('Must provide an implementation of DialogService.alert.');
	}

	/** Generic modal implementation that takes a template / content. */
	public async baseDialog<T> (
		_COMPONENT_TYPE: ComponentType<T>,
		_SET_INPUTS?: (componentInstance: T) => void
	) : Promise<void> {
		throw new Error('Must provide an implementation of DialogService.baseDialog.');
	}

	/** Displays interactive confirmation prompt. */
	public async confirm (_O: {
		cancel: string;
		content: string;
		ok: string;
		timeout?: number;
		title: string;
	}) : Promise<boolean> {
		throw new Error('Must provide an implementation of DialogService.confirm.');
	}

	/** Displays image. */
	public async image (_SRC: string) : Promise<void> {
		throw new Error('Must provide an implementation of DialogService.image.');
	}

	/** Displays toast notification. */
	public async toast (_CONTENT: string, _DURATION: number) : Promise<void> {
		throw new Error('Must provide an implementation of DialogService.toast.');
	}

	constructor () {}
}
