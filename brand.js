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
    {f:"img/logos/everyday-slate.webp", bg:"dark"},
    {f:"img/logos/everyday-black.webp", bg:"light"},
    {f:"img/logos/everyday-green.webp", bg:"dark"},
    {f:"img/logos/everyday-navy-gold.webp", bg:"dark"},
    {f:"img/logos/everyday-white-gold.webp", bg:"light"},
    {f:"img/logos/everyday-orange.webp", bg:"light"},
    {f:"img/logos/everyday-navy-orange.webp", bg:"dark"},
    {f:"img/logos/everyday-white-orange.webp", bg:"light"},
    {f:"img/logos/everyday-gray-orange.webp", bg:"dark"},
    {f:"img/logos/thanksgiving-brown.webp", bg:"dark", holiday:"thanksgiving"},
    {f:"img/logos/thanksgiving-white.webp", bg:"light", holiday:"thanksgiving"},
    {f:"img/logos/thanksgiving-navy-grateful.webp", bg:"dark", holiday:"thanksgiving"},
    {f:"img/logos/christmas-navy-lights.webp", bg:"dark", holiday:"christmas"},
    {f:"img/logos/christmas-red.webp", bg:"dark", holiday:"christmas"},
    {f:"img/logos/christmas-white-green.webp", bg:"light", holiday:"christmas"},
    {f:"img/logos/christmas-happy-holidays-green.webp", bg:"dark", holiday:"christmas"}
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

  var css = ".brandbar{display:flex;align-items:center;gap:14px 18px;flex-wrap:wrap;max-width:1400px;margin:0 auto;"+
    "padding:calc(env(safe-area-inset-top,0px) + 12px) 20px 0}"+
    ".brandbar img{display:block;height:44px;width:auto;max-width:min(200px,55vw);border-radius:6px}"+
    ".brandbar .bn{display:flex;flex-direction:column;line-height:1.2}"+
    ".brandbar .bn b{font-size:1.05rem;font-weight:800;letter-spacing:-.01em;color:var(--ink)}"+
    ".brandbar .bn span{font-size:.85rem;color:var(--muted)}"+
    "@media (max-width:640px){.brandbar{padding-left:16px;padding-right:16px}.brandbar img{height:36px}}"+
    "@media print{.brandbar{display:none!important}}";

  function render(){
    if (document.getElementById("brandbar")) return;
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    var bar = document.createElement("div"); bar.id = "brandbar"; bar.className = "brandbar";
    var logo = pick(new Date());
    if (logo){
      var img = document.createElement("img");
      img.src = logo.f; img.alt = COMPANY; img.onerror = function(){ img.remove(); };
      bar.appendChild(img);
    }
    var bn = document.createElement("div"); bn.className = "bn";
    var b = document.createElement("b"); b.textContent = NAME;
    var sp = document.createElement("span"); sp.textContent = COMPANY;
    bn.appendChild(b); bn.appendChild(sp); bar.appendChild(bn);
    document.body.insertBefore(bar, document.body.firstChild);
  }
  window.Brand = { season: season, thanksgiving: thanksgiving, pick: pick, LOGOS: LOGOS };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render); else render();
})();
