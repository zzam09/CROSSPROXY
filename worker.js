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
      
      // Parse XML using regex for Cloudflare Workers environment
      const clean = parseRss(xml);
      
      if (clean.error) {
        return new Response(
          JSON.stringify({ error: "Invalid XML from upstream" }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
      
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


function parseRss(xml) {
  // Check if it's Atom feed
  if (xml.includes('<feed')) {
    return {
      type: "atom",
      title: extractTag(xml, 'title'),
      link: extractTag(xml, 'link'),
      description: extractTag(xml, 'subtitle'),
      updated: extractTag(xml, 'updated'),
      items: extractItems(xml, 'entry')
    };
  }
  
  // Check if it's RSS feed
  if (xml.includes('<rss') || xml.includes('<channel')) {
    return {
      type: "rss",
      title: extractTag(xml, 'title'),
      link: extractTag(xml, 'link'),
      description: extractTag(xml, 'description'),
      lastBuild: extractTag(xml, 'lastBuildDate'),
      items: extractItems(xml, 'item')
    };
  }
  
  return { error: "Unrecognised feed format" };
}

function extractTag(xml, tagName) {
  // Try multiple patterns for different tag formats
  const patterns = [
    new RegExp(`<${tagName}[^>]*>([\s\S]*?)<\/${tagName}>`, 'is'),
    new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'is')
  ];
  
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) {
      let content = match[1];
      if (!content) continue;
      
      content = content.trim();
      // Remove CDATA wrappers if present
      content = content.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
      // Clean up HTML entities and extra whitespace
      content = content.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      content = content.replace(/\s+/g, ' ').trim();
      
      if (content) return content;
    }
  }
  
  return null;
}

function extractItems(xml, itemTag) {
  // Try multiple regex patterns to catch items
  const patterns = [
    new RegExp(`<${itemTag}[^>]*>([\s\S]*?)<\/${itemTag}>`, 'gi'),
    new RegExp(`<${itemTag}[^>]*>(.*?)<\/${itemTag}>`, 'gis'),
    new RegExp(`<${itemTag}>([\s\S]*?)<\/${itemTag}>`, 'gi')
  ];
  
  const items = [];
  
  for (const pattern of patterns) {
    let match;
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(xml)) !== null) {
      const itemXml = match[1];
      const item = {
        title: extractTag(itemXml, 'title'),
        link: extractTag(itemXml, 'link'),
        description: extractTag(itemXml, 'description') || extractTag(itemXml, 'summary'),
        pubDate: extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'published') || extractTag(itemXml, 'updated'),
        guid: extractTag(itemXml, 'guid') || extractTag(itemXml, 'id'),
        author: extractTag(itemXml, 'author') || extractTag(itemXml, 'dc:creator'),
        category: extractCategories(itemXml)
      };
      
      // Only add if we have some content
      if (item.title || item.link || item.description) {
        items.push(item);
      }
    }
    
    // If we found items with this pattern, break
    if (items.length > 0) break;
  }
  
  return items;
}

function extractCategories(itemXml) {
  const categoryRegex = /<category[^>]*>(.*?)<\/category>/gis;
  const categories = [];
  let match;
  
  while ((match = categoryRegex.exec(itemXml)) !== null) {
    const category = match[1].trim();
    if (category) categories.push(category);
  }
  
  return categories;
}
