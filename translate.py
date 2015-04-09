#!/usr/bin/env python
# -*- coding: utf-8 -*-

import glob
import json
import os
import re
import time
from bs4 import BeautifulSoup


global en

attrs			= ['content', 'placeholder', 'aria-label', 'label']
languages		= [s.split('/')[-1].split('.json')[0] for s in glob.glob('../translations/*.json')]
en				= {}
translations	= {}

f		= open('index.html', 'r')
html	= BeautifulSoup(f.read(), 'html5lib')
f.close()

def translate(text):
	global en

	text	= unicode(text)
	if re.match('[A-Za-z]', text) is not None:
		text		= text.strip()
		en[text]	= text


# Do the move

for elem in html.select('[translate]'):
	for attr in attrs:
		value	= elem.get(attr)
		if value is not None:
			translate(unicode(value))

	ngBind	= elem.get('ng-bind')
	if ngBind is not None:
		quotes	= re.findall('"[^"]*"', ngBind)
		for i in range(len(quotes)):
			if not isinstance(quotes[i], (str, unicode)):
				continue

			quote	= unicode(quotes[i])
			translate(quote[1:-1])

	text		= unicode(elem.string).strip()
	
	if elem.string is None or text.isspace():
		continue
	
	bindings	= re.findall('(.*?)(\\{\\{.*?\\}\\}|$)', text)
	for i in range(len(bindings)):
		translate(bindings[0][0])

f	= open('en.json', 'w')
f.write(json.dumps(en, sort_keys = True, indent = 4, separators = (',', ': ')))
f.close()


for language in languages:
	translations[language]	= {}

	f	= open('../translations/' + language + '.json', 'r')
	translation	= json.loads(f.read())
	f.close()

	for phrase in en:
		if phrase in translation:
			translations[language][phrase]	= translation[phrase]

f	= open('js/' + os.path.split(os.getcwd())[1] + '/translations.js', 'w')
f.write('var translations = ' + json.dumps(translations) + ';')
f.close()
