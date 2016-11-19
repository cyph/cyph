import {
	Directive,
	DoCheck,
	ElementRef,
	Inject,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges
} from '@angular/core';
import {UpgradeComponent} from '@angular/upgrade/static';
import {Util} from '../../util';
import {IChat} from '../chat/ichat';
import {Templates} from '../templates';


/**
 * Angular component for chat cyphertext UI.
 */
@Directive({
	selector: 'cyph-chat-cyphertext'
})
export class ChatCyphertext extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphChatCyphertext';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<'
		},
		template: Templates.chatCyphertext,
		controller: class {
			public Cyph: any;
			public self: IChat;

			constructor () { (async () => {
				while (!self['Cyph']) {
					await Util.sleep(100);
				}

				this.Cyph	= self['Cyph'];
			})(); }
		}
	};


	@Input() self: IChat;

	ngDoCheck () { super.ngDoCheck(); }
	ngOnChanges (changes: SimpleChanges) { super.ngOnChanges(changes); }
	ngOnDestroy () { super.ngOnDestroy(); }
	ngOnInit () { super.ngOnInit(); }

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(ChatCyphertext.title, elementRef, injector);
	}
}
