import webapp2


class Redirect (webapp2.RequestHandler):
	def get (self, path):
		return self.redirect('/#' + path)


app	= webapp2.WSGIApplication([
	webapp2.Route('/<path:.*>', Redirect)
])
