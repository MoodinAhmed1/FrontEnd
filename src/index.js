async function handleRequest(request, env) {
  const url = new URL(request.url);

  // 🔁 REDIRECT logic
  if (url.pathname.startsWith("/r/")) {
    const slug = url.pathname.split("/r/")[1];
    const target = await env.URLS.get(slug);

    if (target) {
      const meta = {
        ua: request.headers.get("user-agent"),
        ip: request.headers.get("cf-connecting-ip"),
        location: request.headers.get("cf-ipcountry"),
        time: new Date().toISOString()
      };
      await env.URLS.put(`log:${slug}:${Date.now()}`, JSON.stringify(meta));
      return Response.redirect(target, 302);
    } else {
      return new Response("Link not found", { status: 404 });
    }
  }

  // 📥 SHORTENING logic
  if (request.method === "POST" && url.pathname === "/api/shorten") {
    const { url: original, slug } = await request.json();

    if (!original || !slug) {
      return new Response("Missing URL or slug", { status: 400 });
    }

    const exists = await env.URLS.get(slug);
    if (exists) {
      return new Response("Slug already exists. Choose a different one.", { status: 409 });
    }

    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(slug)) {
      return new Response("Invalid slug format. Use 3–20 letters, numbers, - or _ only.", { status: 400 });
    }

    await env.URLS.put(slug, original);

    return new Response(JSON.stringify({ short: `https://${url.host}/r/${slug}` }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // 📊 ANALYTICS logic
  if (url.pathname.startsWith("/analytics/")) {
    const slug = url.pathname.split("/analytics/")[1];
    const list = await env.URLS.list({ prefix: `log:${slug}:` });

    const logs = [];
    for (const key of list.keys) {
      const entry = await env.URLS.get(key.name);
      logs.push(JSON.parse(entry));
    }

    return new Response(JSON.stringify(logs, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // 🏠 DEFAULT route
  return new Response("Welcome to your URL shortener! Try POST /api/shorten or GET /r/slug");
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};
