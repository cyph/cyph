/**
 * @file Import web-specific libs and set them in global scope.
 */


import * as jQuery from 'jquery';
(<any> self).$			= jQuery;
(<any> self).jQuery		= jQuery;

import * as angular from 'angular';
(<any> self).angular	= angular;
