/// <reference path="templates.ts" />


namespace Cyph {
	export namespace UI {
		export namespace Directives {
			/**
			 * Angular namespace with directives for static UI components.
			 */
			export class Static {
				/** Module title + namespace for included directives. */
				public static title: string	= 'cyphStatic';

				private static _	= (() => {
					angular.module(Static.title, []).
						directive(Static.title + 'CyphNotFound', () => ({
							restrict: 'A',
							link: scope => scope['Cyph'] = Cyph,
							template: Templates.staticCyphNotFound
						})).
						directive(Static.title + 'CyphSpinningUp', () => ({
							restrict: 'A',
							link: scope => scope['Cyph'] = Cyph,
							template: Templates.staticCyphSpinningUp
						})).
						directive(Static.title + 'Footer', () => ({
							restrict: 'A',
							link: scope => scope['Cyph'] = Cyph,
							template: Templates.staticFooter
						}))
					;
				})();
			}
		}
	}
}
