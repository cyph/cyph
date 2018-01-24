import {Component, HostBinding, Input} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {urlToSafeStyle} from '../../util/safe-values';


/**
 * Angular component to display logo.
 */
@Component({
	selector: 'cyph-logo',
	styleUrls: ['./logo.component.scss'],
	templateUrl: './logo.component.html'
})
export class LogoComponent {
	/** @ignore */
	private cardHeaderInternal: boolean	= false;

	/** @ignore */
	private iconInternal: boolean		= false;

	/** Possible logos. */
	private readonly logos	= {
		horizontal: {
			main: urlToSafeStyle(
				this.envService.customBuildImages.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.white.horizontal.png'
				)
			),
			telehealth: urlToSafeStyle(
				this.envService.customBuildImages.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.telehealth.horizontal.png'
				)
			)
		},
		icon: {
			main: urlToSafeStyle(
				this.envService.customBuildImages.favicon ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.white.icon.png'
				)
			),
			telehealth: urlToSafeStyle(
				this.envService.customBuildImages.favicon ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.telehealth.icon.png'
				)
			)
		},
		vertical: {
			main: urlToSafeStyle(
				this.envService.customBuildImages.logoVertical ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.white.vertical.png'
				)
			),
			telehealth: urlToSafeStyle(
				this.envService.customBuildImages.logoVertical ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.telehealth.vertical.png'
				)
			)
		},
		video: {
			main: urlToSafeStyle(
				this.envService.customBuildImages.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/betalogo.mobile.png'
				)
			),
			telehealth: urlToSafeStyle(
				this.envService.customBuildImages.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/telehealth.video.logo.png'
				)
			)
		}
	};

	/** @ignore */
	private verticalInternal: boolean	= false;

	/** @ignore */
	private videoInternal: boolean		= false;

	/** Alignment of logo position. */
	@Input() public alignment: 'bottom'|'center'|'left'|'right'|'top'	= 'center';

	/** Indicates whether image is a logo in a card. */
	@HostBinding('class.card-header-logo')
	@Input()
	public get cardHeader () : boolean {
		return this.cardHeaderInternal;
	}
	public set cardHeader (value: boolean) {
		this.cardHeaderInternal	= (<any> value) === '' ? true : value;
	}

	/** Indicates whether to use icon image. */
	@Input()
	public get icon () : boolean {
		return this.iconInternal;
	}
	public set icon (value: boolean) {
		this.iconInternal	= (<any> value) === '' ? true : value;
	}

	/** Active logo. */
	public get logo () : Promise<SafeUrl> {
		const logoSet	=
			this.icon ?
				this.logos.icon :
				this.vertical ?
					this.logos.vertical :
					this.video ?
						this.logos.video :
						this.logos.horizontal
		;

		return this.envService.isTelehealth ? logoSet.telehealth : logoSet.main;
	}

	/** Indicates whether to use vertical image. */
	@Input()
	public get vertical () : boolean {
		return this.verticalInternal;
	}
	public set vertical (value: boolean) {
		this.verticalInternal	= (<any> value) === '' ? true : value;
	}

	/** Indicates whether to use video image. */
	@Input()
	public get video () : boolean {
		return this.videoInternal;
	}
	public set video (value: boolean) {
		this.videoInternal	= (<any> value) === '' ? true : value;
	}

	constructor (
		/** @ignore */
		private readonly domSanitizer: DomSanitizer,

		/** @ignore */
		private readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
