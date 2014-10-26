#!/usr/bin/env python
# -*- coding: utf-8 -*-

# https://github.com/buu700/napster.fm/blob/master/translate.py

import json
import re
import time
from bs4 import BeautifulSoup
from microsofttranslator import Translator


global cyph, clientId, clientSecret, translator, placeholder

codec		= 'utf8'
placeholder	= u'CYPHCYPHCYPHCYPHCYPHCYPH'

languages	= [
	'ar',
	'bg',
	'ca',
	'zh-CHS',
	'zh-CHT',
	'cs',
	'da',
	'nl',
	'en',
	'et',
	'fi',
	'fr',
	'de',
	'el',
	'ht',
	'he',
	'hi',
	'mww',
	'hu',
	'id',
	'it',
	'ja',
	'tlh',
	'ko',
	'lv',
	'lt',
	'ms',
	'mt',
	'no',
	'fa',
	'pl',
	'pt',
	'ro',
	'ru',
	'sk',
	'sl',
	'es',
	'sv',
	'th',
	'tr',
	'uk',
	'ur',
	'vi',
	'cy'
]

attrs	= [
	'content',
	'placeholder',
	'aria-label'
]

cyph			= u'cyph'
clientId		= 'Cyph'
clientSecret	= 'LfiDxnyyYXugFVGNnGiPXbydDIAaYNSQmvVv0AHnTD0='
translator		= Translator(clientId, clientSecret)

f			= open('en.html', 'r')
baseHtml	= f.read()
f.close()


def translate(text, language):
	global cyph, clientId, clientSecret, translator

	if text.isspace():
		return text
	
	for i in range(5):
		try:
			cyphInstance	= re.match(cyph + u' ', text, flags = re.IGNORECASE)

			translation	= translator.translate(text, language)
			
			if 'ArgumentException' in translation:
				raise Exception(translation)
			
			if cyphInstance is not None:
				translation	= re.sub(placeholder, cyphInstance, translation, flags = re.IGNORECASE)

			return translation
			
		except Exception, e:
			print(e)
			time.sleep(20)
			translator	= Translator(clientId, clientSecret)
	
	return text


# Do the move

for language in languages:
	f		= open(language + '.html', 'w')
	html	= BeautifulSoup(baseHtml)
	
	for elem in html.select('[translate]'):
		for attr in attrs:
			value	= elem.get(attr)
			if value is not None:
				value		= translate(unicode(value), language)
				elem[attr]	= value

				print(value)


		ngBind	= elem.get('ng-bind')
		if ngBind is not None:
			print(ngBind)

			quotes	= re.findall('"[^"]*"', ngBind)
			for i in range(len(quotes) - 1):
				quote	= unicode(quotes[i])
				print(quote)
				ngBind	= ngBind.replace(quote, '"' + translate(quote[1:-1], language) + '"', 1)
			elem['ng-bind']	= ngBind

			print(ngBind)

		
		
		text		= unicode(elem.string)
		
		if elem.string is None or text.isspace():
			continue
		
		bindings	= re.findall('\\{\\{.*?\\}\\}', text)
		
		# Swap out Angular bindings with placeholders
		for i in range(len(bindings)):
			text	= text.replace(bindings[i], placeholder + str(i))
		
		text		= translate(text, language)
		
		# Swap out placeholders with Angular bindings
		for i in range(len(bindings)):
			text	= text.replace(placeholder + str(i), bindings[i])
		
		elem.string.replace_with(text)
		print(text)
	
	f.write(unicode(html).encode(codec))
	f.close()
