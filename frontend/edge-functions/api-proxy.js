const TCB_API_BASE = "https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api";

export default {
  async onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      const targetUrl = `${TCB_API_BASE}${url.pathname.replace("/api", "")}${url.search}`;

      const headers = new Headers(request.headers);
      headers.delete("host");
      headers.set("origin", TCB_API_BASE);
      headers.set("referer", TCB_API_BASE + "/");

      try {
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: headers,
          body: request.body,
        });

        const newHeaders = new Headers(response.headers);
        newHeaders.set("access-control-allow-origin", "*");
        newHeaders.set("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
        newHeaders.set("access-control-allow-headers", "*");

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `API Proxy Error: ${error.message}`,
          }),
          {
            status: 502,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }
    }

    return next();
  },
};
