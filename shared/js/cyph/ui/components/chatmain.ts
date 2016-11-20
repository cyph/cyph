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
 * Angular component for main chat UI.
 */
@Directive({
	selector: 'cyph-chat-main'
})
export class ChatMain
	extends UpgradeComponent
	implements DoCheck, OnChanges, OnInit, OnDestroy
{
	/** Component title. */
	public static title: string	= 'cyphChatMain';

	/** Component configuration. */
	public static config		= {
		bindings: {
			hideDisconnectMessage: '<',
			self: '<'
		},
		controller: class {
			/** @ignore */
			public Cyph: any;

			/** @ignore */
			public self: IChat;

			/** @ignore */
			public hideDisconnectMessage: boolean;

			constructor () { (async () => {
				while (!self['Cyph']) {
					await Util.sleep();
				}

				this.Cyph	= self['Cyph'];
			})(); }
		},
		template: Templates.chatMain,
		transclude: true
	};


	/** @ignore */
	@Input() public self: IChat;

	/** @ignore */
	@Input() public hideDisconnectMessage: boolean;

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
		super(ChatMain.title, elementRef, injector);
	}
}
