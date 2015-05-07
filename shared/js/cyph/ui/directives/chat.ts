/// <reference path="enterpress.ts" />
/// <reference path="filechange.ts" />
/// <reference path="templates.ts" />


module Cyph {
	export module UI {
		export module Directives {
			/**
			 * Angular module with directives for chat UI components.
			 */
			export class Chat {
				/** Module title + namespace for included directives. */
				public static title: string	= 'cyphChat';

				private static _	= (() => {
					angular.module(Chat.title, [
						'ngMaterial',
						Enterpress.title,
						Filechange.title
					]).
						directive(Chat.title + 'Cyphertext', () => ({
							restrict: 'A',
							scope: {
								$this: '=' + Chat.title + 'Cyphertext'
							},
							link: scope => scope['Cyph'] = Cyph,
							template: Templates.chatCyphertext
						})).
						directive(Chat.title + 'Main', () => ({
							restrict: 'A',
							transclude: true,
							scope: {
								$this: '=' + Chat.title + 'Main'
							},
							link: scope => scope['Cyph'] = Cyph,
							template: Templates.chatMain
						})).
						directive(Chat.title + 'MessageBox', () => ({
							restrict: 'A',
							scope: {
								$this: '=' + Chat.title + 'MessageBox'
							},
							link: scope => scope['Cyph'] = Cyph,
							template: Templates.chatMessageBox
						})).
						directive(Chat.title + 'Sidebar', () => ({
							restrict: 'A',
							scope: {
								$this: '=' + Chat.title + 'Sidebar',
								showChat: '=showChat'
							},
							link: scope => scope['Cyph'] = Cyph,
							template: Templates.chatSidebar
						})).
						directive(Chat.title + 'Toolbar', () => ({
							restrict: 'A',
							scope: {
								$this: '=' + Chat.title + 'Toolbar',
								open: '&open',
								showChat: '=showChat'
							},
							link: scope => scope['Cyph'] = Cyph,
							template: Templates.chatToolbar
						})).
						factory('chatSidenav', [
							'$mdSidenav',

							$mdSidenav => () => $mdSidenav('sidenav')
						])
					;
				})();
			}
		}
	}
}
