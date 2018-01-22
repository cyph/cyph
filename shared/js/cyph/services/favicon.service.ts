import {Injectable} from '@angular/core';
import * as $ from 'jquery';
import {IFaviconSet} from '../favicon/ifavicon-set';
import {EnvService} from './env.service';


/**
 * Manages favicon.
 */
@Injectable()
export class FaviconService {
	/** @ignore */
	private readonly elements	= {
		apple: (size: string) => $(`link[rel='apple-touch-icon'][sizes='${size}x${size}']`),
		icon: (size: string) => $(`link[rel='icon'][sizes='${size}x${size}']`),
		mask: () => $(`link[rel='mask-icon']`),
		mstile: () => $(`meta[name='msapplication-TileImage']`),
		shortcut: (size: string) => $(`link[rel='shortcut icon'][sizes='${size}x${size}']`)
	};

	/** @ignore */
	private readonly faviconSets: {[name: string]: IFaviconSet}	= {
		default: {
			apple114: '',
			apple120: '',
			apple144: '',
			apple152: '',
			apple180: '',
			apple57: '',
			apple60: '',
			apple72: '',
			apple76: '',
			icon16: '',
			icon160: '',
			icon192: '',
			icon256: '',
			icon32: '',
			icon96: '',
			mask: '',
			mstile: '',
			shortcut196: ''
		},
		telehealth: {
			apple114: '/assets/img/favicon/telehealth/apple-touch-icon-114x114.png',
			apple120: '/assets/img/favicon/telehealth/apple-touch-icon-120x120.png',
			apple144: '/assets/img/favicon/telehealth/apple-touch-icon-144x144.png',
			apple152: '/assets/img/favicon/telehealth/apple-touch-icon-152x152.png',
			apple180: '/assets/img/favicon/telehealth/apple-touch-icon-180x180.png',
			apple57: '/assets/img/favicon/telehealth/apple-touch-icon-57x57.png',
			apple60: '/assets/img/favicon/telehealth/apple-touch-icon-60x60.png',
			apple72: '/assets/img/favicon/telehealth/apple-touch-icon-72x72.png',
			apple76: '/assets/img/favicon/telehealth/apple-touch-icon-76x76.png',
			icon16: '/assets/img/favicon/telehealth/favicon-16x16.png',
			icon160: '/assets/img/favicon/telehealth/favicon-160x160.png',
			icon192: '/assets/img/favicon/telehealth/favicon-192x192.png',
			icon256: '/assets/img/favicon/telehealth/favicon-256x256.png',
			icon32: '/assets/img/favicon/telehealth/favicon-32x32.png',
			icon96: '/assets/img/favicon/telehealth/favicon-96x96.png',
			mask: '/assets/img/favicon/telehealth/mask.svg',
			mstile: '/assets/img/favicon/telehealth/mstile-144x144.png',
			shortcut196: '/assets/img/favicon/telehealth/favicon-196x196.png'
		}
	};

	/** Active favicon set. */
	public activeFaviconSet: IFaviconSet	= this.faviconSets.default;

	/**
	 * Changes favicon at run-time for non-co-branded instances.
	 * @param name Name of folder containing alternate favicon set under /assets/img/favicons.
	 */
	public setFavicon (name: 'default'|'telehealth' = 'default') : void {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (
			this.envService.environment.customBuild &&
			this.envService.environment.customBuild.favicon
		) {
			return;
		}

		this.activeFaviconSet	= this.faviconSets[name];

		this.elements.apple('114').attr('href', this.activeFaviconSet.apple114);
		this.elements.apple('120').attr('href', this.activeFaviconSet.apple120);
		this.elements.apple('144').attr('href', this.activeFaviconSet.apple144);
		this.elements.apple('152').attr('href', this.activeFaviconSet.apple152);
		this.elements.apple('180').attr('href', this.activeFaviconSet.apple180);
		this.elements.apple('57').attr('href', this.activeFaviconSet.apple57);
		this.elements.apple('60').attr('href', this.activeFaviconSet.apple60);
		this.elements.apple('72').attr('href', this.activeFaviconSet.apple72);
		this.elements.apple('76').attr('href', this.activeFaviconSet.apple76);
		this.elements.icon('16').attr('href', this.activeFaviconSet.icon16);
		this.elements.icon('160').attr('href', this.activeFaviconSet.icon160);
		this.elements.icon('192').attr('href', this.activeFaviconSet.icon192);
		this.elements.icon('256').attr('href', this.activeFaviconSet.icon256);
		this.elements.icon('32').attr('href', this.activeFaviconSet.icon32);
		this.elements.icon('96').attr('href', this.activeFaviconSet.icon96);
		this.elements.mask().attr('href', this.activeFaviconSet.mask);
		this.elements.mstile().attr('content', this.activeFaviconSet.mstile);
		this.elements.shortcut('196').attr('href', this.activeFaviconSet.shortcut196);
	}

	/* tslint:disable-next-line:cyclomatic-complexity */
	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		if (!this.envService.isWeb || this.faviconSets.default.apple114) {
			return;
		}

		this.faviconSets.default.apple114		= this.elements.apple('114').attr('href') || '';
		this.faviconSets.default.apple120		= this.elements.apple('120').attr('href') || '';
		this.faviconSets.default.apple144		= this.elements.apple('144').attr('href') || '';
		this.faviconSets.default.apple152		= this.elements.apple('152').attr('href') || '';
		this.faviconSets.default.apple180		= this.elements.apple('180').attr('href') || '';
		this.faviconSets.default.apple57		= this.elements.apple('57').attr('href') || '';
		this.faviconSets.default.apple60		= this.elements.apple('60').attr('href') || '';
		this.faviconSets.default.apple72		= this.elements.apple('72').attr('href') || '';
		this.faviconSets.default.apple76		= this.elements.apple('76').attr('href') || '';
		this.faviconSets.default.icon16			= this.elements.icon('16').attr('href') || '';
		this.faviconSets.default.icon160		= this.elements.icon('160').attr('href') || '';
		this.faviconSets.default.icon192		= this.elements.icon('192').attr('href') || '';
		this.faviconSets.default.icon256		= this.elements.icon('256').attr('href') || '';
		this.faviconSets.default.icon32			= this.elements.icon('32').attr('href') || '';
		this.faviconSets.default.icon96			= this.elements.icon('96').attr('href') || '';
		this.faviconSets.default.mask			= this.elements.mask().attr('href') || '';
		this.faviconSets.default.mstile			= this.elements.mstile().attr('content') || '';
		this.faviconSets.default.shortcut196	= this.elements.shortcut('196').attr('href') || '';
	}
}
