/*
  VELQORA SIGNAL ARCHIVE
  Add entries in signals.txt only. No need to edit this file for new posts.
  Format: $TYPE$DATE$TITLE$DESCRIPTION$MEDIA_URLS$LINK_URL
  Types: NOTE, IMAGE, VIDEO, MIXED, FILE, LINK, YOUTUBE
  Separate multiple media URLs with |. Use - for unused fields.
*/
const DATA_FILE = "signals.txt";
let signals = [];
let selectedFilter = "all";
const $ = selector => document.querySelector(selector);
const safeText = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function parseSignals(text) {
  // Each post is wrapped by a standalone dollar-sign line:
  // $
  // TYPE$DATE$TITLE$DESCRIPTION$MEDIA_URLS$LINK_URL
  // $
  // Also accepts older one-line entries without wrapper lines.
  const lines = text.split(/\r?\n/);
  const groups = [];
  let current = [];
  let inside = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '$') {
      if (inside) {
        if (current.some(item => item.trim() && !item.trim().startsWith('#'))) groups.push(current.join('\n').trim());
        current = [];
        inside = false;
      } else {
        inside = true;
        current = [];
      }
    } else if (inside) {
      current.push(rawLine);
    } else if (line && !line.startsWith('#')) {
      groups.push(line);
    }
  }
  if (inside && current.some(item => item.trim() && !item.trim().startsWith('#'))) groups.push(current.join('\n').trim());

  const results = [];
  for (const group of groups) {
    const content = group.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#')).join('\n');
    if (!content) continue;
    let fields;
    if (/\b(TYPE|TITLE|DESCRIPTION|MEDIA|LINK)\s*:/i.test(content)) {
      fields = {};
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*(TYPE|DATE|TITLE|DESCRIPTION|MEDIA|LINK)\s*:\s*(.*?)\s*$/i);
        if (match) fields[match[1].toUpperCase()] = match[2];
      }
    } else {
      const values = content.replace(/^\$+|\$+$/g, '').split('$').map(value => value.trim());
      // Support either TYPE$DATE$TITLE... or $TYPE$DATE$TITLE... lines.
      const offset = values[0] === '' ? 1 : 0;
      fields = { TYPE: values[offset] || 'NOTE', DATE: values[offset+1] || '', TITLE: values[offset+2] || '', DESCRIPTION: values[offset+3] || '', MEDIA: values[offset+4] || '-', LINK: values[offset+5] || '-' };
    }
    const signal = { id: results.length, type: (fields.TYPE || 'NOTE').toUpperCase(), date: fields.DATE || '', title: fields.TITLE || '', description: fields.DESCRIPTION || '', media: fields.MEDIA || '-', link: fields.LINK || '-' };
    if (signal.title && signal.title !== '-') results.push(signal);
  }
  return results;
}
function getCategory(type){return ({NOTE:"text",IMAGE:"photo",VIDEO:"video",YOUTUBE:"video",MIXED:"mixed",FILE:"file",LINK:"link"})[type]||"text";}
function safeURL(value){if(!value||value==="-")return "";try{const url=new URL(value,location.href);return ["http:","https:"].includes(url.protocol)?url.href:"";}catch{return "";}}
function youtubeID(value){try{const url=new URL(value);if(url.hostname.includes("youtu.be"))return url.pathname.slice(1);if(url.hostname.includes("youtube.com")){if(url.pathname==="/watch")return url.searchParams.get("v");if(url.pathname.startsWith("/shorts/")||url.pathname.startsWith("/embed/"))return url.pathname.split("/")[2];}}catch{}return "";}
function mediaHTML(signal){
  const urls=signal.media&&signal.media!=="-"?signal.media.split("|").map(safeURL).filter(Boolean):[];
  if(signal.type==="YOUTUBE"){const id=youtubeID(signal.link!=="-"?signal.link:(urls[0]||""));return id?`<div class="youtube"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}" title="${safeText(signal.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`:"";}
  if(signal.type==="VIDEO")return urls.length?`<div class="media-grid ${urls.length===1?"single":""}">${urls.map(url=>`<video controls preload="metadata" src="${safeText(url)}"></video>`).join("")}</div>`:"";
  if(signal.type==="IMAGE"||signal.type==="MIXED"){const items=urls.map(url=>/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)?`<video controls preload="metadata" src="${safeText(url)}"></video>`:`<img src="${safeText(url)}" alt="${safeText(signal.title)}" loading="lazy">`);return items.length?`<div class="media-grid ${items.length===1?"single":""}">${items.join("")}</div>`:"";}
  if(signal.type==="FILE"||signal.type==="LINK"){const url=safeURL(signal.link!=="-"?signal.link:urls[0]);if(!url)return "";let host="",filename="Open resource";try{host=new URL(url).hostname;filename=decodeURIComponent(url.split("/").pop().split("?")[0])||filename;}catch{}const file=signal.type==="FILE";return `<a class="resource" href="${safeText(url)}" target="_blank" rel="noopener noreferrer"><span class="resource-icon">${file?"↧":"↗"}</span><span class="resource-copy"><strong>${safeText(file?filename:signal.title)}</strong><small>${safeText(host)} · ${file?"Open or download file":"Open destination"}</small></span><span class="resource-arrow">↗</span></a>`;}
  return "";
}
function renderSignal(signal){const labels={NOTE:"TEXT SIGNAL",IMAGE:"IMAGE SIGNAL",VIDEO:"VIDEO SIGNAL",MIXED:"MIXED MEDIA",FILE:"FILE SIGNAL",LINK:"WEB LINK",YOUTUBE:"YOUTUBE SIGNAL"};return `<article class="entry"><div class="entry-head"><div class="mini-sigil"><img src="https://raw.githubusercontent.com/uuhjeike/VELQORA/main/%F0%9D%93%A5%F0%9D%93%AE%F0%9D%93%B5%F0%9D%93%AD%F0%9D%93%B8%F0%9D%93%BB%F0%9D%93%AA%20%F0%9D%93%A3%F0%9D%93%AE%F0%9D%93%B6%F0%9D%93%B9%F0%9D%93%AE%F0%9D%93%BC%F0%9D%93%BD.jpg" alt="" /></div><div><div class="entry-author">Velqora <span class="verified">✧</span></div><time class="entry-date">${safeText(signal.date||"SIGNAL ARCHIVE")}</time></div><span class="entry-type">${labels[signal.type]||"SIGNAL"}</span></div><h3>${safeText(signal.title)}</h3>${signal.description&&signal.description!=="-"?`<p class="entry-body">${safeText(signal.description)}</p>`:""}${mediaHTML(signal)}<div class="entry-foot"><span>✦ &nbsp; VELQORA SIGNAL VAULT</span><span>SIGNAL ${String(signal.id+1).padStart(3,"0")}</span></div></article>`;}
function updateFeed(){const query=($("#search").value||"").toLowerCase().trim();const visible=signals.filter(signal=>(selectedFilter==="all"||getCategory(signal.type)===selectedFilter)&&(signal.title+" "+signal.description+" "+signal.date+" "+signal.type).toLowerCase().includes(query));$("#feed").innerHTML=visible.length?visible.map(renderSignal).join(""):`<div class="empty">No signals found in this frequency.<br><br>Try another filter or add an entry in <strong>signals.txt</strong>.</div>`;$("#post-count").textContent=signals.length;}
async function loadSignals(){try{const response=await fetch(DATA_FILE,{cache:"no-store"});if(!response.ok)throw new Error("Cannot load signals");signals=parseSignals(await response.text());updateFeed();}catch{$("#feed").innerHTML=`<div class="empty error">Unable to read signals.txt.<br><br>Run a local server in this folder with <strong>python -m http.server 8000</strong>, then visit <strong>http://localhost:8000</strong>.</div>`;}}
document.querySelectorAll(".filter").forEach(button=>button.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(item=>item.classList.remove("active"));button.classList.add("active");selectedFilter=button.dataset.filter;updateFeed();}));
$("#search").addEventListener("input",updateFeed);
loadSignals();
