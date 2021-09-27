package functions;

import com.google.cloud.functions.HttpFunction;
import com.google.cloud.functions.HttpRequest;
import com.google.cloud.functions.HttpResponse;
import com.syncfusion.ej2.wordprocessor.FormatType;
import com.syncfusion.ej2.wordprocessor.WordProcessorHelper;
import java.io.IOException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

public class Convert implements HttpFunction {

	@Override
	public void service(final HttpRequest request, final HttpResponse response)
		throws IOException {
		String result = "";
		int status = 500;

		/* Retry logic to work around error: `java.lang.ClassCastException: class [Ljava.lang.Object; cannot be cast to class [Lcom.syncfusion.docio.HTMLConverterImpl$TextFormat; ([Ljava.lang.Object; is in module java.base of loader 'bootstrap'; [Lcom.syncfusion.docio.HTMLConverterImpl$TextFormat; is in unnamed module of loader com.google.cloud.functions.invoker.runner.Invoker$FunctionClassLoader @1c655221)` */
		for (int i = 0; status != 200 && i < 5; ++i) {
			try {
				final Document document = Jsoup.parse(
					new String(
						request.getInputStream().readNBytes(134217728),
						"UTF-8"
					)
				);

				document
					.outputSettings()
					.syntax(Document.OutputSettings.Syntax.xml);

				result =
					WordProcessorHelper.loadString(
						document.html(),
						FormatType.Html
					);

				status = 200;
			} catch (Exception err) {
				result = err.toString();
			}
		}

		response.setStatusCode(status);
		response.getWriter().write(result);
	}
}
