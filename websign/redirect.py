import webapp2


class Redirect (webapp2.RequestHandler):
	def decorateHeaders (self, path):
		self.response.headers.add_header('Location', '/#' + path)
		self.response.status	= 301

	def get (self, path):
		self.decorateHeaders(path)
		self.response.write('')

	def head(self, path):
		self.decorateHeaders(path)

	def options(self, path):
		self.decorateHeaders(path)


app	= webapp2.WSGIApplication([
	('/(.*)', Redirect),
])
