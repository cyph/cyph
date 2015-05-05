module Cyph {
	export module UI {
		export module Directives {
			export class Filechange {
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
