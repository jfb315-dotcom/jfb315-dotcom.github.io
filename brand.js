// Logo bar shown at the top of every page: the company logo plus John's name.
// A random everyday logo is picked each time a page opens. For the 30 days leading up to
// Thanksgiving, and then to Christmas, only that holiday's logos are used.
// Add logos to img/logos/ and list them below:
//   bg: "dark" (logo has a dark/colored background) or "light" (white or see-through background)
//   holiday: "thanksgiving" or "christmas" (leave out for everyday logos)
(function(){
  var NAME = "John Bischof";
  var COMPANY = "Home Mortgage Solutions, LLC";
  var LOGOS = [
    {h:201, f:"img/logos/everyday-slate.webp", bg:"dark"},
    {h:201, f:"img/logos/everyday-black.webp", bg:"light"},
    {h:201, f:"img/logos/everyday-green.webp", bg:"dark"},
    {h:201, f:"img/logos/everyday-navy-gold.webp", bg:"dark"},
    {h:201, f:"img/logos/everyday-white-gold.webp", bg:"light"},
    {h:201, f:"img/logos/everyday-orange.webp", bg:"light"},
    {h:201, f:"img/logos/everyday-navy-orange.webp", bg:"dark"},
    {h:201, f:"img/logos/everyday-white-orange.webp", bg:"light"},
    {h:201, f:"img/logos/everyday-gray-orange.webp", bg:"dark"},
    {h:236, f:"img/logos/thanksgiving-brown.webp", bg:"dark", holiday:"thanksgiving"},
    {h:236, f:"img/logos/thanksgiving-white.webp", bg:"light", holiday:"thanksgiving"},
    {h:236, f:"img/logos/thanksgiving-navy-grateful.webp", bg:"dark", holiday:"thanksgiving"},
    {h:236, f:"img/logos/christmas-navy-lights.webp", bg:"dark", holiday:"christmas"},
    {h:236, f:"img/logos/christmas-red.webp", bg:"dark", holiday:"christmas"},
    {h:236, f:"img/logos/christmas-white-green.webp", bg:"light", holiday:"christmas"},
    {h:236, f:"img/logos/christmas-happy-holidays-green.webp", bg:"dark", holiday:"christmas"}
  ];

  var DAY = 864e5;
  function midnight(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  // Thanksgiving: 4th Thursday of November
  function thanksgiving(y){ var d = new Date(y, 10, 1); return new Date(y, 10, 1 + (4 - d.getDay() + 7) % 7 + 21); }
  // Which holiday window today falls in (the 30 days leading up to and including the holiday).
  // Thanksgiving wins the overlap in late November until Thanksgiving Day has passed.
  function season(now){
    var t = midnight(now), y = t.getFullYear();
    var tg = thanksgiving(y), xm = new Date(y, 11, 25);
    function within(h){ return t <= h && (h - t) / DAY <= 30; }
    if (within(tg)) return "thanksgiving";
    if (within(xm)) return "christmas";
    return null;
  }
  function isDark(){
    var r = document.documentElement;
    if (r.dataset.theme) return r.dataset.theme === "dark";
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function pick(now){
    var s = season(now), pool = LOGOS.filter(function(l){ return s ? l.holiday === s : !l.holiday; });
    if (!pool.length) pool = LOGOS.filter(function(l){ return !l.holiday; });
    if (!pool.length) return null;
    // Prefer logos that suit the light or dark screen; white-background logos look out of place on a dark page.
    var fit = isDark() ? pool.filter(function(l){ return l.bg === "dark"; }) : pool;
    var list = fit.length ? fit : pool;
    return list[Math.floor(Math.random() * list.length)];
  }

  // Main navigation, the same on every page; the current page is highlighted.
  var NAV = [
    {href:"./", match:/(\/|index\.html)$/, label:"Dashboard",
     icon:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'},
    {href:"clients.html", match:/clients\.html$/, label:"Clients",
     icon:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-6 6.5-6s5.9 2.4 6.5 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.9.2 4.9 2.4 5.4 5.8"/>'},
    {href:"checklist.html", match:/checklist\.html$/, label:"Document request", short:"Documents",
     icon:'<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>'}
  ];

  function render(){
    // Each page has an empty #brandbar at the top (its space is reserved in site.css) so nothing jumps when this fills it.
    var bar = document.getElementById("brandbar"), made = !bar;
    if (bar && bar.firstChild) return;
    if (made){ bar = document.createElement("div"); bar.id = "brandbar"; }
    bar.className = "brandbar";
    // Line the bar up with the page's own content column.
    var host = document.querySelector(".shell, .wrap");
    if (host){ var cs = getComputedStyle(host); bar.style.maxWidth = cs.maxWidth; bar.style.paddingLeft = cs.paddingLeft; bar.style.paddingRight = cs.paddingRight; }
    else { bar.style.maxWidth = "1100px"; bar.style.padding = "14px 16px 0"; }
    var left = document.createElement("div"); left.className = "bl";
    var logo = pick(new Date());
    if (logo){
      var img = document.createElement("img");
      img.width = 480; img.height = logo.h; img.fetchPriority = "high";
      img.src = logo.f; img.alt = COMPANY; img.onerror = function(){ img.remove(); };
      left.appendChild(img);
    }
    var bn = document.createElement("div"); bn.className = "bn";
    var b = document.createElement("b"); b.textContent = NAME;
    var sp = document.createElement("span"); sp.textContent = COMPANY;
    bn.appendChild(b); bn.appendChild(sp); left.appendChild(bn); bar.appendChild(left);
    var nav = document.createElement("nav"); nav.className = "brandnav"; nav.setAttribute("aria-label","Main");
    var path = location.pathname;
    NAV.forEach(function(n){
      var a = document.createElement("a"); a.href = n.href;
      if (n.match.test(path) || (n.label==="Dashboard" && /\/$/.test(path))) a.setAttribute("aria-current","page");
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">'+n.icon+'</svg><span class="full">'+n.label+'</span><span class="short">'+(n.short||n.label)+'</span>';
      nav.appendChild(a);
    });
    bar.appendChild(nav);
    if (made) document.body.insertBefore(bar, document.body.firstChild);
  }
  window.Brand = { season: season, thanksgiving: thanksgiving, pick: pick, LOGOS: LOGOS };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render); else render();
})();
