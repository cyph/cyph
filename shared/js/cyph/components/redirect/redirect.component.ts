import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {StringsService} from '../../services/strings.service';
import {sleep} from '../../util/wait';


/**
 * Angular component for redirecting.
 */
@Component({
	selector: 'cyph-redirect',
	template: ''
})
export class RedirectComponent implements OnInit {
	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		await sleep(0);

		this.router.navigate(
			(
				this.router.routerState.snapshot.root.firstChild &&
				this.router.routerState.snapshot.root.firstChild.firstChild &&
				this.router.routerState.snapshot.root.firstChild.firstChild.url.length > 0
			) ?
				this.router.routerState.snapshot.root.firstChild.firstChild.url.
					map(o => o.path)
				:
				['']
		);
	}

	constructor (
		/** @ignore */
		private readonly router: Router,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
