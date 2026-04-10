export default {
  async fetch(request) {
    const url = new URL(request.url);
    const user = url.pathname.split("/rss/")[1];
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Missing user" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const targetUrl = `http://mail.tidebridges.com:8091/${user}/rss`;
    
    try {
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: `Upstream error: ${response.status}` }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
      
      const xml = await response.text();
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const parserError = doc.querySelector("parsererror");
      
      if (parserError) {
        return new Response(
          JSON.stringify({ error: "Invalid XML from upstream" }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
      
      const clean = parseRss(doc);
      
      return new Response(JSON.stringify(clean, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch RSS", detail: err.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};

function childText(el, tag) {
  const found = el.querySelector(tag);
  return found ? (found.textContent || "").trim() : null;
}

function parseItem(item) {
  return {
    title: childText(item, "title"),
    link: childText(item, "link"),
    description: childText(item, "description") ?? childText(item, "summary"),
    pubDate: childText(item, "pubDate") ?? childText(item, "published") ?? childText(item, "updated"),
    guid: childText(item, "guid") ?? childText(item, "id"),
    author: childText(item, "author") ?? childText(item, "dc\\:creator"),
    category: [...item.querySelectorAll("category")]
      .map(c => c.textContent.trim())
      .filter(Boolean)
  };
}

function parseRss(doc) {
  const feed = doc.querySelector("feed");
  if (feed) {
    return {
      type: "atom",
      title: childText(feed, "title"),
      link: childText(feed, "link"),
      description: childText(feed, "subtitle"),
      updated: childText(feed, "updated"),
      items: [...feed.querySelectorAll("entry")].map(parseItem)
    };
  }
  
  const channel = doc.querySelector("channel");
  if (channel) {
    return {
      type: "rss",
      title: childText(channel, "title"),
      link: childText(channel, "link"),
      description: childText(channel, "description"),
      lastBuild: childText(channel, "lastBuildDate"),
      items: [...channel.querySelectorAll("item")].map(parseItem)
    };
  }
  
  return { error: "Unrecognised feed format" };
}
