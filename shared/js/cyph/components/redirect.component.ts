import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {sleep} from '../util/wait';


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

		this.routerService.navigate(
			(
				this.routerService.routerState.snapshot.root.firstChild &&
				this.routerService.routerState.snapshot.root.firstChild.firstChild &&
				this.routerService.routerState.snapshot.root.firstChild.firstChild.url.length > 0
			) ?
				this.routerService.routerState.snapshot.root.firstChild.firstChild.url.
					map(o => o.path)
				:
				['']
		);
	}

	constructor (
		/** @ignore */
		private readonly routerService: Router
	) {}
}
