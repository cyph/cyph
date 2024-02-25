import Koa from 'koa';

const app = new Koa({
	proxy: true
});

app.use(ctx => {
	if (!ctx.req.url) {
		ctx.status = 404;
		return;
	}

	const url = new URL(`https://${ctx.host}`);
	url.hash = ctx.req.url.slice(1);
	url.pathname = '';
	url.search = '';

	ctx.status = 301;
	ctx.redirect(url.toString());
});

app.listen(
	typeof process.env.PORT === 'number' ?
		process.env.PORT :
	typeof process.env.PORT === 'string' && process.env.PORT ?
		parseInt(process.env.PORT, 10) :
		8080
);
