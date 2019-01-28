import webapp2


class Redirect (webapp2.RequestHandler):
	def decorateHeaders (self, path):
		location = '/#' + path

		# Workaround for Tor server configuration
		if 'X-Forwarded-Host' in self.request.headers:
			location = 'https://' + self.request.headers['X-Forwarded-Host'] + location

		self.redirect(location, True)

	def get (self, path):
		self.decorateHeaders(path)
		self.response.write('')

	def head (self, path):
		self.decorateHeaders(path)

	def options (self, path):
		self.decorateHeaders(path)


app	= webapp2.WSGIApplication([
	('/(.*)', Redirect),
])
