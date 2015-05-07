module Cyph {
	export module UI {
		export module Directives {
			/**
			 * Angular directive for handling changes to the
			 * selected file of an input element.
			 */
			export class Filechange {
				/** Module/directive title. */
				public static title: string	= 'cyphFilechange';

				private static _	= (() => {
					angular.module(Filechange.title, []).directive(Filechange.title, () => ({
						restrict: 'A',
						link: (scope, element, attrs) => {
							element.change(() => {
								const methodSplit: string[]	= attrs[Filechange.title].split('.');
								const methodName: string	= methodSplit.slice(-1)[0].split('(')[0];

								const methodObject: any		= scope.$parent.$eval(
									methodSplit.slice(0, -1).join('.')
								);

								methodObject[methodName](element[0]);
							});
						}
					}));
				})();
			}
		}
	}
}
