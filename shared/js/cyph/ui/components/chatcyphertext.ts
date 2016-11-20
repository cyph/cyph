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
export class ChatCyphertext
	extends UpgradeComponent implements DoCheck, OnChanges, OnInit, OnDestroy {
	/** Component title. */
	public static title: string	= 'cyphChatCyphertext';

	/** Component configuration. */
	public static config		= {
		bindings: {
			self: '<'
		},
		controller: class {
			/** @ignore */
			public cyph: any;

			/** @ignore */
			public self: IChat;

			constructor () { (async () => {
				while (!self['cyph']) {
					await Util.sleep();
				}

				this.cyph	= self['cyph'];
			})(); }
		},
		template: Templates.chatCyphertext
	};


	/** @ignore */
	@Input() public self: IChat;

	/** @ignore */
	public ngDoCheck () : void {
		super.ngDoCheck();
	}

	/** @ignore */
	public ngOnChanges (changes: SimpleChanges) : void {
		super.ngOnChanges(changes);
	}

	/** @ignore */
	public ngOnDestroy () : void {
		super.ngOnDestroy();
	}

	/** @ignore */
	public ngOnInit () : void {
		super.ngOnInit();
	}

	constructor (
		@Inject(ElementRef) elementRef: ElementRef,
		@Inject(Injector) injector: Injector
	) {
		super(ChatCyphertext.title, elementRef, injector);
	}
}
