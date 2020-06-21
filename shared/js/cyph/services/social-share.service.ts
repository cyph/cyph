import {Injectable} from '@angular/core';
import {take} from 'rxjs/operators';
import {BaseProvider} from '../base-provider';
import {SocialShareComponent} from '../components/social-share';
import {resolvable} from '../util/wait';
import {DialogService} from './dialog.service';

/**
 * Angular service for social sharing.
 */
@Injectable()
export class SocialShareService extends BaseProvider {
	/** Social share dialog. */
	public async share ({
		description = '',
		hashTags = [],
		title = '',
		url
	}: {
		description?: string;
		hashTags?: string[];
		title?: string;
		url: string;
	}) : Promise<void> {
		const closeFunction = resolvable<() => void>();
		const socialShareOpened = resolvable();

		const closed = this.dialogService.baseDialog(
			SocialShareComponent,
			o => {
				o.description = description;
				o.hashTags = hashTags;
				o.title = title;
				o.url = url;

				socialShareOpened.resolve(o.opened.pipe(take(1)).toPromise());
			},
			closeFunction,
			true
		);

		await socialShareOpened;
		(await closeFunction)();
		await closed;
	}

	constructor (
		/** @ignore */
		private readonly dialogService: DialogService
	) {
		super();
	}
}
