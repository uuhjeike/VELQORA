/*
  This website reads posts.txt. Add or edit posts in that text file only.
  Keep each post on one line, and separate fields with the $ symbol.
  Format: $TYPE$DATE$TITLE$TEXT$MEDIA1|MEDIA2$LINK
  Types: TEXT, PHOTO, VIDEO, MIXED, FILE, LINK, YOUTUBE
  Use a dash (-) for any unused field. Use public URLs for media.
*/
const FEED_FILE = "posts.txt";
let allPosts = [];
let activeFilter = "all";

const $ = (selector) => document.querySelector(selector);
const esc = (value = "") => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function splitFields(line) {
  // Dollar symbols separate the six fields; do not use $ inside field text.
  return line.split("$").map(value => value.trim());
}
function parsePosts(text) {
  return text.split(/\r?\n/).map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
    .map((line, index) => {
      const fields = splitFields(line);
      const [type = "TEXT", date = "", title = "", body = "", media = "-", link = "-"] = fields;
      return { id: index, type: type.toUpperCase(), date, title, body, media, link };
    }).filter(post => post.title && post.title !== "-");
}
function categoryFor(type) {
  if (type === "PHOTO") return "photo";
  if (type === "VIDEO" || type === "YOUTUBE") return "video";
  if (type === "MIXED") return "mixed";
  if (type === "FILE") return "file";
  if (type === "LINK") return "link";
  return "text";
}
function safeUrl(value) {
  if (!value || value === "-") return "";
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}
function youtubeId(value) {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2];
    }
  } catch {}
  return "";
}
function mediaMarkup(post) {
  const urls = post.media && post.media !== "-" ? post.media.split("|").map(safeUrl).filter(Boolean) : [];
  if (post.type === "YOUTUBE") {
    const id = youtubeId(post.link !== "-" ? post.link : (urls[0] || ""));
    return id ? `<div class="youtube"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}" title="${esc(post.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>` : "";
  }
  if (post.type === "VIDEO") {
    return urls.length ? `<div class="media-grid ${urls.length === 1 ? "single" : ""}">${urls.map(url => `<video controls preload="metadata" src="${esc(url)}"></video>`).join("")}</div>` : "";
  }
  if (post.type === "PHOTO" || post.type === "MIXED") {
    const images = urls.filter(url => /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url));
    const videos = urls.filter(url => /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url));
    const media = [...images.map(url => `<img src="${esc(url)}" alt="${esc(post.title)}" loading="lazy">`), ...videos.map(url => `<video controls preload="metadata" src="${esc(url)}"></video>`)];
    return media.length ? `<div class="media-grid ${media.length === 1 ? "single" : ""}">${media.join("")}</div>` : "";
  }
  if (post.type === "FILE") {
    const url = safeUrl(post.link !== "-" ? post.link : urls[0]);
    if (!url) return "";
    const filename = decodeURIComponent(url.split("/").pop().split("?")[0] || "Open file");
    return `<a class="file-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="file-icon">↧</span><span class="file-copy"><strong>${esc(filename)}</strong><small>Open or download file</small></span><span class="link-arrow">↗</span></a>`;
  }
  if (post.type === "LINK") {
    const url = safeUrl(post.link !== "-" ? post.link : urls[0]);
    if (!url) return "";
    let host = "";
    try { host = new URL(url).hostname; } catch {}
    return `<a class="link-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="link-icon">↗</span><span class="link-copy"><strong>${esc(post.title)}</strong><small>${esc(host)} · Open link</small></span><span class="link-arrow">↗</span></a>`;
  }
  return "";
}
function renderPost(post) {
  const label = ({TEXT:"TEXT POST",PHOTO:"PHOTO POST",VIDEO:"VIDEO POST",MIXED:"MIXED MEDIA",FILE:"FILE",LINK:"LINK",YOUTUBE:"YOUTUBE VIDEO"})[post.type] || "POST";
  return `<article class="post" data-category="${categoryFor(post.type)}" data-search="${esc((post.title+" "+post.body+" "+post.date+" "+post.type).toLowerCase())}">
    <div class="post-head"><div class="mini-avatar">AM</div><div><div class="post-author">Alex Morgan <span class="verified">✓</span></div><time class="post-date">${esc(post.date || "PERSONAL ARCHIVE")}</time></div><span class="post-type">${label}</span></div>
    <h3>${esc(post.title)}</h3>${post.body && post.body !== "-" ? `<p class="post-body">${esc(post.body)}</p>` : ""}
    ${mediaMarkup(post)}
    <div class="post-foot"><span class="tag">✦ &nbsp; ALEX'S ARCHIVE</span><span>POST ${String(post.id + 1).padStart(3,"0")}</span></div>
  </article>`;
}
function updateFeed() {
  const query = ($("#search").value || "").toLowerCase().trim();
  const shown = allPosts.filter(post => (activeFilter === "all" || categoryFor(post.type) === activeFilter) &&
    (post.title+" "+post.body+" "+post.date+" "+post.type).toLowerCase().includes(query));
  $("#feed").innerHTML = shown.length ? shown.map(renderPost).join("") :
    `<div class="empty">No posts match this view.<br><br><span>Try another filter or edit <strong>posts.txt</strong>.</span></div>`;
  $("#post-count").textContent = allPosts.length;
}
async function loadPosts() {
  try {
    const response = await fetch(FEED_FILE, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load posts.txt");
    allPosts = parsePosts(await response.text());
    updateFeed();
  } catch (error) {
    $("#feed").innerHTML = `<div class="empty error">Couldn't load posts.txt.<br><br>Run this folder using a local web server (not by double-clicking index.html).<br><br>Example: <strong>python -m http.server 8000</strong><br>Then open <strong>http://localhost:8000</strong>.</div>`;
  }
}
document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".filter").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  activeFilter = button.dataset.filter;
  updateFeed();
}));
$("#search").addEventListener("input", updateFeed);
loadPosts();
