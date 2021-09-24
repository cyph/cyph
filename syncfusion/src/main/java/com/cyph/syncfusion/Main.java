package com.cyph.syncfusion;

import com.sun.net.httpserver.HttpServer;
import com.syncfusion.ej2.wordprocessor.FormatType;
import com.syncfusion.ej2.wordprocessor.WordProcessorHelper;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

public class Main {

	public static void main(final String[] args)
		throws IOException, NumberFormatException {
		final HttpServer server = HttpServer.create(
			new InetSocketAddress(
				"0.0.0.0",
				Integer.parseInt(System.getenv().getOrDefault("PORT", "443"))
			),
			0
		);

		server.createContext(
			"/convert",
			(final var context) -> {
				byte[] result = new byte[0];
				int status = 500;

				try {
					final Document document = Jsoup.parse(
						new String(
							context.getRequestBody().readNBytes(134217728),
							"UTF-8"
						)
					);

					document
						.outputSettings()
						.syntax(Document.OutputSettings.Syntax.xml);

					result =
						WordProcessorHelper
							.loadString(document.html(), FormatType.Html)
							.getBytes();

					status = 200;
				} catch (Exception err) {
					result = err.toString().getBytes();
				}

				context.sendResponseHeaders(status, result.length);
				try (final OutputStream res = context.getResponseBody()) {
					res.write(result);
				}
			}
		);

		server.start();
	}
}
