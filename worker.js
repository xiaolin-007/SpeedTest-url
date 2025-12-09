export default {
  async fetch(request) {
    let url = new URL(request.url);
    let path = url.pathname.substring(1);

    let bytes;

    // 默认 200MB
    if (!path) {
      bytes = 200000000;
    } else if (path === "locations") {
      const targetUrl = "https://speed.cloudflare.com/locations";
      return fetch(targetUrl);
    } else {
      const regex = /^(\d+)([a-z]?)$/i;
      const match = path.match(regex);

      if (!match) {
        return new Response("路径格式不正确", { status: 400 });
      }

      bytes = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();

      if (unit === "k") bytes *= 1000;
      else if (unit === "m") bytes *= 1000000;
      else if (unit === "g") bytes *= 1000000000;
    }

    // ❗强制使用 HTTPS，否则 speed.cloudflare.com 会返回 404
    const targetUrl = `https://speed.cloudflare.com/__down?bytes=${bytes}`;

    // ❗不使用原始 request 作为 init，避免 header 冲突
    return fetch(targetUrl);
  }
}
