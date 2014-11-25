#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Why the hell did I write this in Python? Python is banned from any further use in this company.

# https://github.com/buu700/napster.fm/blob/master/translate.py

import json
import re
import time
from subprocess import check_output
from bs4 import BeautifulSoup
from microsofttranslator import Translator


global cyph, clientId, clientSecret, translator, placeholder
global cyphtranslations, languages, attrs, codec, baseHtml

codec		= 'utf8'
placeholder	= u'☁'

f			= open('../languages.json', 'r')
languages	= json.loads(f.read()).keys()
f.close()

attrs	= [
	'content',
	'placeholder',
	'aria-label',
	'label'
]

cyph			= u'cyph'
clientId		= 'Cyph'
clientSecret	= 'LfiDxnyyYXugFVGNnGiPXbydDIAaYNSQmvVv0AHnTD0='
translator		= Translator(clientId, clientSecret)

f			= open('en.html', 'r')
baseHtml	= f.read()
f.close()

cyphtranslations	= {}



def translate(text, language):
	global cyph, clientId, clientSecret, translator, cyphtranslations

	text	= unicode(text)

	if re.match('[A-Za-z]', text) is None:
		return text

	text	= text.strip()

	try:
		return cyphtranslations[language][text]
	except:
		print

	originalText	= text

	for i in range(5):
		try:
			cyphInstance	= re.search(cyph + u' ', text, flags = re.IGNORECASE)

			if cyphInstance is not None:
				cyphInstance	= cyphInstance.group()
				text			= re.sub(cyphInstance, placeholder + u' ', text)

			translation	= translator.translate(text, language)

			if 'ArgumentException' in translation:
				raise Exception(translation)

			if cyphInstance is not None:
				translation	= re.sub(placeholder, cyphInstance[0:-1], translation, flags = re.IGNORECASE)

			cyphtranslations[language][originalText]	= translation
			return translation
			
		except Exception, e:
			print(e)
			time.sleep(20)
			translator	= Translator(clientId, clientSecret)
	
	return text


# Do the move

for language in languages:
	cyphtranslationsPath	= '../../translations/' + language + '.json'
	try:
		f	= open(cyphtranslationsPath, 'r')
		cyphtranslations[language]	= json.loads(f.read())
		f.close()
	except:
		cyphtranslations[language]	= {}



	f		= open(language + '.html', 'w')
	html	= BeautifulSoup(baseHtml, 'html5lib')
	
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
			for i in range(len(quotes)):
				if not isinstance(quotes[i], (str, unicode)):
					continue

				quote	= unicode(quotes[i])
				print(quote)
				ngBind	= ngBind.replace(quote, '"' + translate(quote[1:-1], language) + '"', 1)
			elem['ng-bind']	= ngBind

			print(ngBind)

		
		
		text		= unicode(elem.string).strip()
		
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


	if u'zh-CHS' in unicode(language):
		f	= open('zh.html', 'w')
		f.write(unicode(html).encode(codec))
		f.close()

		f		= open('../../translations/en.json', 'w')
		english	= cyphtranslations[language].copy()

		for k in english:
			english[k]	= k

		f.write(json.dumps(english, sort_keys = True, indent = 4, separators = (',', ': ')))
		f.close()



	f	= open(cyphtranslationsPath, 'w')
	f.write(json.dumps(cyphtranslations[language], sort_keys = True, indent = 4, separators = (',', ': ')))
	f.close()



languages.append('en')
languages.append('zh')
yaml		= check_output('ls *.yaml | head -n1', shell = True)[0:-1]
f			= open(yaml, 'r')
yamlText	= f.read().replace('BALLS', '|'.join(languages))
f.close()
f			= open(yaml, 'w')
f.write(yamlText)
f.close()
