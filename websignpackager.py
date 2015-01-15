#!/usr/bin/env python
# -*- coding: utf-8 -*-

import glob
import json
import re
import time
from bs4 import BeautifulSoup


f		= open('index.html', 'r')
html	= BeautifulSoup(f.read(), 'html5lib')
f.close()


for elem in html.select('script[src]'):
	path	= elem.get('src')
	if path[0] is '/':
		path	= path[1:]

	f			= open(path, 'r')
	elem.string	= f.read()
	f.close()

	del elem['src']

for elem in html.select('link[rel="stylesheet"]'):
	path	= elem.get('href')
	if path[0] is '/':
		path	= path[1:]

	f			= open(path, 'r')
	elem.string	= f.read()
	f.close()

	del elem['rel']
	del elem['href']

	elem.name	= 'style'


f	= open('index.html', 'w')
f.write(unicode(html).encode('utf8'))
f.close()
