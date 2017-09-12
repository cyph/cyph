import {Injectable} from '@angular/core';
import {RouteReuseStrategy} from '@angular/router';


/**
 * RouteReuseStrategy implementation that prevents component reuse upon route change.
 */
@Injectable()
export class ComponentReusePreventionService implements RouteReuseStrategy {
	/** @inheritDoc */
	/* tslint:disable-next-line:no-null-keyword */
	public retrieve () : null {
		/* tslint:disable-next-line:no-null-keyword */
		return null;
	}

	/** @inheritDoc */
	public shouldAttach () : boolean {
		return false;
	}

	/** @inheritDoc */
	public shouldDetach () : boolean {
		return false;
	}

	/** @inheritDoc */
	public shouldReuseRoute () : boolean {
		return false;
	}

	/** @inheritDoc */
	public store () : void {}

	constructor () {}
}
