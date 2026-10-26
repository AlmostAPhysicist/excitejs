import{n as e,t}from"./reactor-CUx62Pa_.js";import{t as n}from"./scheduler-DR5rcNf-.js";var r=`https://github.com/nicoverbruggen/ebook-fonts/tree/13834303660d071657b1aa885da02c2d075b5368/fonts/core`,i=`https://github.com/ryanoasis/nerd-fonts/tree/master/patched-fonts/FiraCode`,a=`https://github.com/google/fonts/tree/main/ofl/kalam`,o=`Libron`,s=`Fira Code Nerd Font Mono`,c=200,l=[{id:`sys-serif`,name:`System serif`,css:`Georgia, "Times New Roman", serif`,faces:[],builtin:!0},{id:`sys-sans`,name:`System sans`,css:`system-ui, -apple-system, "Segoe UI", sans-serif`,faces:[],builtin:!0},{id:`sys-mono`,name:`System mono`,css:`ui-monospace, Menlo, Consolas, monospace`,faces:[],builtin:!0}],u=[[`Regular`,`normal`,400],[`Italic`,`italic`,400],[`Bold`,`normal`,700],[`Bold Italic`,`italic`,700]],ee=[`R`,`I`,`B`,`BI`],d=[`red`,`orange`,`yellow`,`green`,`cyan`,`blue`,`purple`,`magenta`],f=`### CHAPTER I.

# Down the Rabbit-Hole

Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice “without pictures or conversations?”

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, “Oh dear! Oh dear! I shall be late!” (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.

In another moment down went Alice after it, never once considering how in the world she was to get out again.

The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.

---

## Specimen

> Typography is a minor technicality of civilized life.
>
> — Stanley Morison (typographer who directed the design of Times New Roman)

> A man who would letterspace lower case would steal sheep, Frederic Goudy liked to say. If this wisdom needs updating, it is chiefly to add that a woman who would letterspace lower case would steal sheep as well.
>
> — Robert Bringhurst (Canadian poet and typographer), *The Elements of Typographic Style*

Numerals: chapter 1 of 24, page 0371, the year 1859. Punctuation: “quotes,” apostrophes’ curl, the dash — and the ellipsis…

Hamburgefonstiv · Il1| O0 · rn m · ff fi fl ffi · Åsa Ñoño Œuvre

The quick brown fox jumps over the lazy dog. **THE QUICK BROWN FOX** *jumps over the lazy dog.* ***Both at once, for the bold italic.***

Code is set in ${s}, ligatures and all:

\`\`\`
a = 2
b = 3
if a >= b:
    println(a - b)
else:
    println(b - a)
\`\`\`

Nerd Font icons work in inline code too: \`\uE0A0 main\`, \`\uF09B github\`.

---
`,p=[`कि वो पहली सी मोहब्बत याद आती है`,`जब उसकी आँखें मुझसे कुछ कहलाती है`,`जब बिन कहे वो पूरी दास्तान समझ जाती है`,`जब मेरी हया में भी वो मेरे मन कि पहेली सुलझाती है`],te=`
<div class="app">
  <aside class="rail" aria-label="Font sources">
    <div class="brand">
      <h1>Typography <span>/ fonts</span></h1>
      <div class="theme" role="group" aria-label="Theme">
        <button type="button" data-theme-set="system">auto</button>
        <button type="button" data-theme-set="light">light</button>
        <button type="button" data-theme-set="dark">dark</button>
      </div>
    </div>

    <section class="add">
      <p class="label">Add from GitHub</p>
      <form id="add-form">
        <textarea id="repo-input" spellcheck="false" placeholder="https://github.com/owner/repo/tree/main/fonts&#10;one link per line, or owner/repo/path"></textarea>
        <div class="add-row">
          <button class="btn primary" type="submit" id="fetch-btn">Fetch fonts</button>
          <span class="hint">.ttf .otf .woff .woff2</span>
        </div>
        <p class="msg err" id="fetch-msg" role="status" hidden></p>
      </form>
    </section>

    <section>
      <p class="label">Sources <em id="src-count"></em></p>
      <ul class="sources" id="source-list"></ul>
      <label class="drop" id="drop">
        <input type="file" id="file-input" multiple accept=".ttf,.otf,.woff,.woff2">
        Drop font files here, or choose files
      </label>
    </section>

    <section>
      <p class="label">Families <em id="fam-count"></em></p>
      <ul class="fams" id="fam-list"></ul>
    </section>
  </aside>

  <main class="work">
    <div class="toolbar" role="toolbar" aria-label="Formatting">
      <div class="group font">
        <select class="tsel" id="family" aria-label="Font family"></select>
      </div>
      <div class="group">
        <button class="tb" type="button" id="size-down" aria-label="Smaller">−</button>
        <input class="tnum" id="size" type="number" min="8" max="160" step="1" value="20" aria-label="Font size in pixels">
        <button class="tb" type="button" id="size-up" aria-label="Larger">+</button>
        <span class="unit">px</span>
      </div>
      <span class="sep" aria-hidden="true"></span>
      <div class="group">
        <button class="tb b" type="button" id="bold" aria-label="Bold" title="Bold (Ctrl/⌘ B)">B</button>
        <button class="tb i" type="button" id="italic" aria-label="Italic" title="Italic (Ctrl/⌘ I)">I</button>
        <details class="pop" id="fg-pop">
          <summary class="tb" aria-label="Text color" title="Text color">
            <span class="stack"><span class="glyph">A</span><span class="chip" id="fg-chip"></span></span>
          </summary>
          <div class="panel">
            <div class="swatches" id="fg-swatches"></div>
            <label class="custom" for="fg-custom">Custom color <input type="color" id="fg-custom" value="#205ea6"></label>
          </div>
        </details>
        <details class="pop" id="bg-pop">
          <summary class="tb" aria-label="Background color" title="Background color">
            <span class="stack"><span class="glyph hl">A</span><span class="chip" id="bg-chip"></span></span>
          </summary>
          <div class="panel">
            <div class="swatches" id="bg-swatches"></div>
            <label class="custom" for="bg-custom">Custom color <input type="color" id="bg-custom" value="#faeec6"></label>
          </div>
        </details>
        <button class="tb" type="button" id="clear" title="Clear formatting in selection" aria-label="Clear formatting">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3h8M7 3l-2 10M10 9l4 4M14 9l-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </button>
      </div>
      <span class="scope" id="scope">whole document</span>
    </div>

    <div class="facebar" id="facebar"></div>

    <div class="stage">
      <article class="sheet" id="editor" contenteditable="true" spellcheck="false" aria-label="Playground text"></article>
    </div>

    <div class="statusline">
      <span id="stat-words">0 words</span>
      <span id="stat-font"></span>
      <span class="md">Markdown shortcuts: # ## &gt; - **bold** *italic* \`code\` \`\`\`↵ ·<button class="linkbtn" type="button" id="md-open">Edit as Markdown</button></span>
    </div>
  </main>
</div>

<dialog class="mdlg" id="md-dialog">
  <form method="dialog">
    <h2>Markdown</h2>
    <textarea id="md-text" spellcheck="false" aria-label="Markdown source"></textarea>
    <div class="row">
      <span class="hint">Keeps headings, lists, quotes, bold, italic and code. Fonts and colors stay in the editor only.</span>
      <button class="btn" type="button" id="md-copy">Copy</button>
      <button class="btn" type="button" id="md-cancel">Close</button>
      <button class="btn primary" type="button" id="md-load">Replace editor text</button>
    </div>
  </form>
</dialog>

<div class="toast" id="toast" hidden></div>
`,m=`typography:v2:`,h={get(e,t){try{let n=localStorage.getItem(m+e);return n==null?t:JSON.parse(n)}catch{return t}},set(e,t){try{localStorage.setItem(m+e,JSON.stringify(t))}catch{}}};function ne(e){let t=5381;for(let n=0;n<e.length;n++)t=t*33^e.charCodeAt(n);return(t>>>0).toString(36)}function g(e){return String(e).replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}var _=e=>/\.(ttf|otf|woff2?)$/i.test(e);async function re(e,t,n){let r=0,i=Array.from({length:Math.min(t,e.length)},async()=>{for(;r<e.length;)await n(e[r++])});await Promise.all(i)}var v=[[`hairline`,100],[`thin`,100],[`extralight`,200],[`ultralight`,200],[`semilight`,350],[`light`,300],[`book`,400],[`regular`,400],[`normal`,400],[`roman`,400],[`retina`,450],[`medium`,500],[`semibold`,600],[`demibold`,600],[`extrabold`,800],[`ultrabold`,800],[`bold`,700],[`extrablack`,950],[`black`,900],[`heavy`,900]],ie={100:`Thin`,200:`ExtraLight`,300:`Light`,350:`SemiLight`,400:`Regular`,450:`Retina`,500:`Medium`,600:`SemiBold`,700:`Bold`,800:`ExtraBold`,900:`Black`,950:`ExtraBlack`},ae=/^(hairline|thin|extra ?light|ultra ?light|semi ?light|light|book|regular|normal|roman|retina|medium|semi ?bold|demi ?bold|extra ?bold|ultra ?bold|bold|extra ?black|black|heavy)?(italic|oblique|it)?$/i,y=/^(.*?)(hairline|thin|extralight|ultralight|semilight|light|book|regular|normal|roman|retina|medium|semibold|demibold|extrabold|ultrabold|bold|extrablack|black|heavy)?(italic|oblique)?$/i;function oe(e){let t=e.split(`/`).pop().replace(/\.(ttf|otf|woff2?)$/i,``),n=/\[[^\]]*\]|variable|[-_]VF$/i.test(t);t=t.replace(/\[[^\]]*\]/g,``).replace(/[-_ ]?(variablefont|variable|VF)$/i,``).replace(/[-_ ]+$/,``);let r=t,i=``,a=t.lastIndexOf(`-`);if(a>0&&ae.test(t.slice(a+1).replace(/[_ ]/g,``)))r=t.slice(0,a),i=t.slice(a+1);else{let e=t.match(y);e&&e[1]&&(e[2]||e[3])&&(r=e[1],i=(e[2]||``)+(e[3]||``))}r=r.replace(/[-_]+$/,``);let o=i.toLowerCase().replace(/[\s_-]/g,``),s=/italic|oblique/.test(o)||/^it$|[a-z]it$/.test(o)&&o!==``,c=400;for(let[e,t]of v)if(o.includes(e)){c=t;break}let l=(/[_\s]/.test(r)?r.replace(/_/g,` `):r.replace(/([a-z])([A-Z])/g,`$1 $2`)).replace(/\s+/g,` `).trim(),u;return u=n?s?`Variable Italic`:`Variable`:c===400?s?`Italic`:`Regular`:ie[c]+(s?` Italic`:``),{family:l,key:l.toLowerCase(),weight:n?`100 900`:String(c),style:s?`italic`:`normal`,label:u,sort_w:n?400:c,file:e}}function se(e){let t=e.trim().replace(/[?#].*$/,``).replace(/\/+$/,``);if(!t)return null;t=t.replace(/^git@github\.com:/,`github.com/`).replace(/\.git$/,``);let n;if(n=t.match(/^(?:https?:\/\/)?raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(.+)$/i))return{owner:n[1],repo:n[2],ref_parts:n[3].split(`/`)};t=t.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i,``);let r=t.split(`/`).filter(Boolean).map(decodeURIComponent);if(r.length<2)return null;let[i,a,o,...s]=r;return o===`tree`||o===`blob`?{owner:i,repo:a,ref_parts:s}:{owner:i,repo:a,path:[o,...s].filter(Boolean).join(`/`)}}var b=class extends Error{kind;constructor(e,t){super(e),this.kind=t}};async function x(e){let t;try{t=await fetch(e,{headers:{Accept:`application/vnd.github+json`}})}catch{throw new b(`blocked`,`network`)}if(t.status===403||t.status===429){let e=Number(t.headers.get(`x-ratelimit-reset`));throw new b(`GitHub's limit for anonymous requests is used up. Try again after ${e?new Date(e*1e3).toLocaleTimeString([],{hour:`numeric`,minute:`2-digit`}):`an hour`}.`,`rate`)}if(t.status===404)return null;if(!t.ok)throw new b(`GitHub answered ${t.status}.`,`http`);return t.json()}async function S(e,t,n){let r=_(n),i=r?n.split(`/`).slice(0,-1).join(`/`):n,a=await x(`${e}/git/trees/${encodeURIComponent(i?`${t}:${i}`:t)}?recursive=1`);if(!a||!a.tree)return null;let o=i?i+`/`:``,s=a.tree.filter(e=>e.type===`blob`&&_(e.path)).map(e=>o+e.path);return r?s.filter(e=>e===n):s}async function ce(e){let t=`https://api.github.com/repos/${e.owner}/${e.repo}`;if(e.ref_parts){for(let n=1;n<=e.ref_parts.length;n++){let r=e.ref_parts.slice(0,n).join(`/`),i=e.ref_parts.slice(n).join(`/`),a=await S(t,r,i);if(a)return{ref:r,path:i,files:a}}throw new b(`Couldn't find that repository, branch or folder. Check the link and that the repo is public.`,`missing`)}let n=await x(t);if(!n)throw new b(`Couldn't find that repository. Check the link and that the repo is public.`,`missing`);let r=n.default_branch,i=e.path||``,a=await S(t,r,i);if(!a)throw new b(`Couldn't find ${i||`the repository's files`}.`,`missing`);return{ref:r,path:i,files:a}}function le(e){let t=oe(e),n=u.findIndex(([,e,n])=>t.style===e&&t.sort_w===n);return n<0?u.length:n}function C(e){return g(e).replace(/`([^`]+)`/g,`<code>$1</code>`).replace(/\*\*([^*]+)\*\*|__([^_]+)__/g,(e,t,n)=>`<strong>${t||n}</strong>`).replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)|(^|[^_\w])_([^_\s][^_]*?)_(?![_\w])/g,(e,t,n,r,i)=>`${t??r??``}<em>${n??i}</em>`).replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,`<a href="$2" target="_blank" rel="noopener">$1</a>`)}function w(e){let t=e.replace(/\r/g,``).split(`
`),n=[],r=[],i=[],a=null,o=()=>{r.length&&(n.push(`<p>${C(r.join(` `))}</p>`),r=[])},s=()=>{a&&=(n.push(`<${a.tag}>${a.items.map(e=>`<li>${C(e)}</li>`).join(``)}</${a.tag}>`),null)},c=()=>{if(!i.length)return;let e=i.join(`
`).split(/\n\s*\n/).map(e=>e.replace(/\n/g,` `).trim()).filter(Boolean);n.push(`<blockquote>${e.map(e=>`<p${/^(—|--)\s/.test(e)?` class="cite"`:``}>${C(e)}</p>`).join(``)}</blockquote>`),i=[]},l=()=>{o(),s(),c()},u=null;for(let e of t){let t;if(u){/^\s*```\s*$/.test(e)?(n.push(T(u.lines.join(`
`),u.lang)),u=null):u.lines.push(e);continue}if(t=e.match(/^\s*```\s*([\w+#.-]*)\s*$/)){l(),u={lang:t[1],lines:[]};continue}if(!e.trim()){l();continue}if(t=e.match(/^(#{1,3})\s+(.*)$/)){l(),n.push(`<h${t[1].length}>${C(t[2])}</h${t[1].length}>`);continue}if(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/.test(e)){l(),n.push(`<hr>`);continue}if(t=e.match(/^>\s?(.*)$/)){o(),s(),i.push(t[1]);continue}if(t=e.match(/^\s*[-*+]\s+(.*)$/)){o(),c(),(!a||a.tag!==`ul`)&&(s(),a={tag:`ul`,items:[]}),a.items.push(t[1]);continue}if(t=e.match(/^\s*\d+[.)]\s+(.*)$/)){o(),c(),(!a||a.tag!==`ol`)&&(s(),a={tag:`ol`,items:[]}),a.items.push(t[1]);continue}s(),c(),r.push(e.trim())}return l(),u&&n.push(T(u.lines.join(`
`),u.lang)),n.join(`
`)||`<p><br></p>`}function T(e,t=``){return`<pre${t?` data-lang="${g(t)}"`:``}><code>${g(e)}</code></pre>`}function ue(e){let t=``,n=e=>{if(e.nodeType===Node.TEXT_NODE){t+=e.data;return}if(e.nodeType!==Node.ELEMENT_NODE)return;let r=e.tagName;if(r===`BR`){t+=`
`;return}(r===`DIV`||r===`P`)&&t&&!t.endsWith(`
`)&&(t+=`
`),e.childNodes.forEach(n)};return n(e),t.replace(/\u200B/g,``).replace(/\n$/,``)}function de(e){let t=e=>{if(e.nodeType===Node.TEXT_NODE)return e.data.replace(/\u200B/g,``);if(e.nodeType!==Node.ELEMENT_NODE)return``;let n=e,r=[...n.childNodes].map(t).join(``);switch(n.tagName){case`STRONG`:case`B`:return r.trim()?`**${r}**`:r;case`EM`:case`I`:return r.trim()?`*${r}*`:r;case`CODE`:return"`"+r+"`";case`A`:return`[${r}](${n.getAttribute(`href`)})`;case`BR`:return`
`;default:return r}},n=[];for(let r of e.childNodes){if(r.nodeType===Node.TEXT_NODE){let e=r.data.trim();e&&n.push(e);continue}if(r.nodeType!==Node.ELEMENT_NODE)continue;let e=r,i=e.tagName;if(/^H[1-3]$/.test(i))n.push(`#`.repeat(+i[1])+` `+t(e).trim());else if(i===`BLOCKQUOTE`){let r=e.querySelector(`:scope > p`)?[...e.children].map(e=>t(e).trim()):[t(e).trim()];n.push(r.filter(Boolean).join(`

`).split(`
`).map(e=>e?`> `+e:`>`).join(`
`))}else i===`UL`||i===`OL`?n.push([...e.children].map((e,n)=>(i===`UL`?`- `:`${n+1}. `)+t(e).trim()).join(`
`)):i===`HR`?n.push(`---`):i===`PRE`?n.push("```"+(e.dataset.lang||``)+`
`+ue(e)+"\n```"):n.push(t(e).trim())}return n.filter(Boolean).join(`

`)+`
`}function E(){let m=n(),v=m.getOrCreate(`render`),ie=m.getOrCreate(`sync`),ae=e(h.get(`theme`,`system`)),y=e([]),x=e([]),S=e(l[0]),C=e(null),T=e(l[0]),E=e(null),D=e(null),O=e(``),k=e(``),A=e(`var(--tx)`),fe=e(`var(--hl-yellow)`),j=e(0),M=e(null),N=e(!1),P=e(!1),F=e(null),pe=0,me=0,I=null,L=document.createElement(`div`);L.className=`typography`,L.innerHTML=te;let R=e=>L.querySelector(e),z=R(`#editor`),B=R(`#family`),V=R(`#size`),he=[...L.querySelectorAll(`[data-theme-set]`)],H=R(`#md-dialog`),U=R(`#md-text`),W=R(`#repo-input`),ge=R(`#drop`),_e=()=>[...x._value,...l],ve=e=>_e().find(t=>t.id===e),G=e=>!!e&&(e===z||z.contains(e));function K(){let e=E._value;return!!e&&!e.collapsed&&G(e.commonAncestorContainer)}function q(){let e=E._value;if(!e)return!1;z.focus({preventScroll:!0});let t=getSelection();return t.removeAllRanges(),t.addRange(e),!0}function J(e){S.value=e,T.value=e}function Y(e){F.value=e}t(()=>{let e=ae.value;e===`system`?document.documentElement.removeAttribute(`data-theme`):document.documentElement.setAttribute(`data-theme`,e);for(let t of he)t.setAttribute(`aria-pressed`,String(t.dataset.themeSet===e));h.set(`theme`,e)}),t(()=>{let e=y.value,t=R(`#source-list`);t.innerHTML=e.length?``:`<li class="empty">No sources yet. Paste a GitHub folder link above.</li>`;for(let n of e){let e=document.createElement(`li`);e.className=`source`,e.dataset.state=n.state,e.innerHTML=`<div class="path"><b>${g(n.label)}</b>${n.sub?`<br>${g(n.sub)}`:``}</div>
                <button class="x" type="button" aria-label="Remove ${g(n.label)}" title="Remove">×</button>
                <div class="meta"><span class="dot"></span><span>${g(n.note)}</span></div>`,e.querySelector(`.x`).addEventListener(`click`,()=>Ee(n)),t.appendChild(e)}R(`#src-count`).textContent=e.length?String(e.length):``},{reaction_schedule:v}),t(()=>{h.set(`links`,y.value.filter(e=>e.kind===`github`).map(e=>e.link))},{deps:[y],reaction_schedule:v}),t(()=>{let e=x.value,t=S.value,n=R(`#fam-list`);n.innerHTML=e.length?``:`<li class="empty">Families appear here once a source loads.</li>`;for(let r of e){let e=document.createElement(`li`);e.innerHTML=`<button class="fam" type="button" aria-current="${t.id===r.id}">
                <span class="nm" style="font-family:${g(r.css)}">${g(r.name)}</span>
                <span class="faces">${be(r)}</span></button>`,e.firstElementChild.addEventListener(`click`,()=>ke(r.id)),n.appendChild(e)}R(`#fam-count`).textContent=e.length?String(e.length):``},{reaction_schedule:v}),t(()=>{let e=x.value,t=B.value;B.innerHTML=``;for(let t of y._value){let n=e.filter(e=>e.source_id===t.id);if(!n.length)continue;let r=document.createElement(`optgroup`);r.label=t.label+(t.sub?` · `+t.sub:``);for(let e of n)r.appendChild(new Option(`${e.name}  (${e.faces.length})`,e.id));B.appendChild(r)}let n=document.createElement(`optgroup`);n.label=`System`;for(let e of l)n.appendChild(new Option(e.name,e.id));B.appendChild(n),B.value=t&&ve(t)?t:S._value.id},{reaction_schedule:v}),t(()=>{z.style.fontFamily=S.value.css},{reaction_schedule:v}),t(()=>{let e=C.value;e?z.style.setProperty(`--code-font`,`"${e.css_name}", ui-monospace, Menlo, Consolas, monospace`):z.style.removeProperty(`--code-font`)},{reaction_schedule:v}),t(()=>{z.style.fontSize=D.value?D.value+`px`:``},{reaction_schedule:v}),t(()=>{z.style.color=O.value},{reaction_schedule:v}),t(()=>{z.style.backgroundColor=k.value},{reaction_schedule:v}),t(()=>{R(`#fg-chip`).style.background=A.value},{reaction_schedule:v}),t(()=>{R(`#bg-chip`).style.background=fe.value},{reaction_schedule:v}),t(()=>{let e=T.value;x.value;let t=y._value.find(t=>t.id===e.source_id),n;if(e.builtin)n=`<span class="facetag">Browser default faces</span>`;else{let t=new Set;n=u.map(([n,r,i])=>{let a=e.faces.find(e=>e.style===r&&e.sort_w===i);return a&&t.add(a.label),`<span class="facetag${a?``:` missing`}" style="font-family:${g(e.css)};font-style:${r};font-weight:${i}" title="${a?g(a.file):`Not in this source; the browser will fake it`}">${n}</span>`}).join(``)+e.faces.filter(e=>!t.has(e.label)).map(t=>`<span class="facetag" style="font-family:${g(e.css)};font-style:${t.style};font-weight:${t.sort_w}" title="${g(t.file)}">${g(t.label)}</span>`).join(``)}R(`#facebar`).innerHTML=`<span class="fname">${g(e.name)}</span>${n}${t?`<span class="src">${g(t.label)}${t.sub?` · `+g(t.sub):``}</span>`:``}`,R(`#stat-font`).textContent=`${e.name}${e.builtin?``:` · ${e.faces.length} faces`}`},{reaction_schedule:v});let ye=t(()=>{let e=(z.innerText.replace(/\u200B/g,``).match(/\S+/g)||[]).length;R(`#stat-words`).textContent=`${e} words`},{deps:[j],reaction_schedule:v});t(()=>{let e=setTimeout(()=>h.set(`draft`,z.innerHTML),600);return()=>clearTimeout(e)},{deps:[j]}),t(()=>{let e=E.value,t=K(),n=R(`#scope`);n.textContent=t?`selection`:`whole document`,n.classList.toggle(`sel`,t);let r=e?e.startContainer:null;r&&r.nodeType===Node.TEXT_NODE&&(r=r.parentElement),(!r||!G(r))&&(r=z);let i=r,a=getComputedStyle(i);V.value=String(Math.round(parseFloat(a.fontSize)));let o=a.fontFamily.split(`,`)[0].replace(/["']/g,``).trim();B.value=(x.value.find(e=>e.css_name===o)??S.value).id,R(`#bold`).setAttribute(`aria-pressed`,String(Number(a.fontWeight)>=600&&i!==z&&!/^H[1-3]$/.test(i.tagName))),R(`#italic`).setAttribute(`aria-pressed`,String(a.fontStyle===`italic`&&i.tagName!==`BLOCKQUOTE`))},{deps:[E,x,S],reaction_schedule:ie}),t(()=>{let e=R(`#fetch-msg`);e.hidden=!M.value,e.textContent=M.value??``}),t(()=>{R(`#fetch-btn`).disabled=N.value}),t(()=>{ge.classList.toggle(`over`,P.value)}),t(()=>{let e=R(`#toast`),t=F.value;if(e.hidden=!t,!t)return;e.textContent=t;let n=setTimeout(()=>{F.value=null},2600);return()=>clearTimeout(n)});function be(e){let t=ee.filter((t,n)=>e.faces.some(e=>e.style===u[n][1]&&e.sort_w===u[n][2])),n=e.faces.length-t.length;return t.map(e=>`<span class="facepip">${e}</span>`).join(``)+(n>0?`<span class="facepip">+${n}</span>`:``)}async function xe(e,t,n){let r=oe(t),i=x._value.find(t=>t.source_id===e.id&&t.key===r.key);if(!i){let t=`tc-${ne(e.link||`local`)}-${r.key.replace(/[^a-z0-9]+/g,`-`)}`;i={id:`f`+ ++pe,name:r.family,key:r.key,css_name:t,css:`"${t}", Georgia, serif`,source_id:e.id,faces:[]},x._value.push(i)}let a=new FontFace(i.css_name,n,{weight:r.weight,style:r.style});return await a.load(),document.fonts.add(a),!C._value&&i.name===s&&(C.value=i),i.faces.some(e=>e.label===r.label)||i.faces.push(r),i.faces.sort((e,t)=>e.sort_w-t.sort_w||Number(e.style===`italic`)-Number(t.style===`italic`)),i}function X(e,t,n){e.state=t,e.note=n,y.trigger()}function Se(e){return x._value.filter(t=>t.source_id===e.id).length}function Ce(e,t){let n=Se(e);if(X(e,`ok`,`${n} ${n===1?`family`:`families`} · ${t} files`),x.trigger(),S._value.builtin&&e.link!==a){let t=x._value.filter(t=>t.source_id===e.id),n=t.find(e=>e.name===o)||t.find(e=>!/\b(code|mono)\b/i.test(e.name))||(e.link===i?void 0:t[0]);n&&J(n)}}async function we(e){let t=se(e.link);if(!t){X(e,`error`,`That doesn't look like a GitHub link.`);return}e.label=`${t.owner}/${t.repo}`,X(e,`loading`,`Reading folder…`);try{let{ref:n,path:r,files:i}=await ce(t);if(e.sub=`${r||`/`} @ ${/^[0-9a-f]{40}$/.test(n)?n.slice(0,7):n}`,!i.length)throw new b(`No .ttf, .otf, .woff or .woff2 files under ${r||`the repo root`}.`,`empty`);if(i.length>c)throw new b(`That folder holds ${i.length} font files. Point to a smaller subfolder.`,`big`);i.sort((e,t)=>le(e)-le(t));let a=`https://raw.githubusercontent.com/${t.owner}/${t.repo}/${n.split(`/`).map(encodeURIComponent).join(`/`)}/`,o=0;await re(i,5,async t=>{let n;try{n=await fetch(a+t.split(`/`).map(encodeURIComponent).join(`/`))}catch{throw new b(`blocked`,`network`)}if(!n.ok)throw new b(`Couldn't download ${t.split(`/`).pop()} (${n.status}).`,`http`);try{await xe(e,t,await n.arrayBuffer())}catch(e){console.warn(`Skipped unreadable font`,t,e)}X(e,`loading`,`Loading ${++o} of ${i.length} files…`)}),Ce(e,i.length)}catch(t){X(e,`error`,t instanceof b&&t.kind===`network`?`Couldn't reach GitHub. Check your connection, or drop the font files below.`:t instanceof Error&&t.message||`Something went wrong while loading.`)}}function Te(e){let t=e.split(/[\s,]+/).map(e=>e.trim()).filter(Boolean),n=[];for(let e of t){if(y._value.some(t=>t.link===e))continue;let t={id:`s`+ ++me,link:e,label:e,state:`loading`,note:``,kind:`github`};y._value.push(t),n.push(t)}return y.trigger(),Promise.all(n.map(we))}function Ee(e){e===I&&(I=null),y.value=y._value.filter(t=>t!==e),x.value=x._value.filter(t=>t.source_id!==e.id),S._value.source_id===e.id?J(x._value[0]||l[0]):T._value.source_id===e.id&&(T.value=S._value),C._value?.source_id===e.id&&(C.value=null)}async function De(e){let t=[...e].filter(e=>_(e.name));if(!t.length){Y(`Those weren't font files (.ttf, .otf, .woff, .woff2).`);return}I||(I={id:`s`+ ++me,link:``,label:`Your files`,sub:`added in this browser`,state:`loading`,note:``,kind:`local`},y._value.push(I));let n=I;X(n,`loading`,`Loading ${t.length} files…`);let r=0;for(let e of t)try{await xe(n,e.name,await e.arrayBuffer()),r++}catch(t){console.warn(`Skipped`,e.name,t)}let i=Se(n);r?X(n,`ok`,`${i} ${i===1?`family`:`families`} · ${r} files`):X(n,`error`,`None of those files could be read as fonts.`),x.trigger();let a=x._value.filter(e=>e.source_id===n.id).pop();a&&J(a)}function Oe(e){let t=e.commonAncestorContainer;if(t.nodeType===Node.TEXT_NODE)return[t];let n=[],r=document.createTreeWalker(t,NodeFilter.SHOW_TEXT),i;for(;i=r.nextNode();)i.data.length&&e.intersectsNode(i)&&n.push(i);return n}function Z(e){if(!K())return!1;let t=E._value,n=Oe(t).map(e=>({n:e,s:e===t.startContainer?t.startOffset:0,e:e===t.endContainer?t.endOffset:e.data.length})).filter(e=>e.e>e.s);if(!n.length)return!1;let r=[];for(let t of n){let n=t.n;t.e<n.data.length&&n.splitText(t.e),t.s>0&&(n=n.splitText(t.s));let i=n.parentElement,a;i.classList.contains(`tc`)&&i.childNodes.length===1?a=i:(a=document.createElement(`span`),a.className=`tc`,i.insertBefore(a,n),a.appendChild(n));for(let[t,n]of Object.entries(e))n==null?a.style.removeProperty(t):a.style.setProperty(t,n);r.push(n)}let i=document.createRange();i.setStart(r[0],0);let a=r[r.length-1];return i.setEnd(a,a.data.length),E.value=i,q(),!0}function ke(e){let t=ve(e);t&&(Z({"font-family":t.css})?T.value=t:J(t))}function Q(e){e=Math.max(8,Math.min(160,Math.round(e)||20)),V.value=String(e),Z({"font-size":e+`px`})||(D.value=e)}function Ae(e){A.value=e,Z({color:e})||(O.value=e)}function je(e){let t=e===`transparent`;fe.value=t?`var(--ui-2)`:e,Z({"background-color":t?null:e,"border-radius":t?null:`0.15em`})||(k.value=t?``:e)}function Me(e){q(),document.execCommand(`styleWithCSS`,!1,`false`),document.execCommand(e),E.trigger()}function Ne(){if(K()){q(),document.execCommand(`removeFormat`);let e=getSelection(),t=e.rangeCount?e.getRangeAt(0):null;t&&z.querySelectorAll(`span.tc`).forEach(e=>{t.intersectsNode(e)&&e.removeAttribute(`style`)})}else z.querySelectorAll(`span.tc`).forEach(e=>e.replaceWith(...e.childNodes)),O.value=``,k.value=``,A.value=`var(--tx)`,Y(`Cleared colors, sizes and fonts set on parts of the text.`);E.trigger()}for(let e of he)e.addEventListener(`click`,()=>{ae.value=e.dataset.themeSet});document.addEventListener(`selectionchange`,()=>{let e=getSelection();e&&e.rangeCount&&G(e.anchorNode)&&(E.value=e.getRangeAt(0).cloneRange())}),document.addEventListener(`pointerdown`,e=>{e.target.closest?.(`.toolbar, .sheet, .mdlg`)||(E.value=null)}),L.querySelectorAll(`.toolbar button, .toolbar summary`).forEach(e=>e.addEventListener(`mousedown`,e=>e.preventDefault())),B.addEventListener(`change`,()=>ke(B.value)),V.addEventListener(`change`,()=>Q(Number(V.value))),V.addEventListener(`keydown`,e=>{e.key===`Enter`&&(e.preventDefault(),Q(Number(V.value)))}),R(`#size-down`).addEventListener(`click`,()=>Q(Number(V.value)-2)),R(`#size-up`).addEventListener(`click`,()=>Q(Number(V.value)+2)),R(`#bold`).addEventListener(`click`,()=>Me(`bold`)),R(`#italic`).addEventListener(`click`,()=>Me(`italic`)),R(`#clear`).addEventListener(`click`,Ne);function Pe(e,t,n,r,i,a){let o=document.createElement(`button`);return o.type=`button`,o.className=`sw`,o.title=e,o.setAttribute(`aria-label`,`${e} ${t}`),o.style.background=n,o.style.color=r,o.textContent=i,o.addEventListener(`mousedown`,e=>e.preventDefault()),o.addEventListener(`click`,a),o}let Fe=R(`#fg-pop`),Ie=R(`#bg-pop`),Le=e=>e[0].toUpperCase()+e.slice(1),Re=[[`Text`,`var(--tx)`],[`Muted`,`var(--tx-2)`],...d.map(e=>[Le(e),`var(--${e})`])];for(let[e,t]of Re)R(`#fg-swatches`).appendChild(Pe(e,`text`,`var(--bg)`,t,`A`,()=>{Ae(t),Fe.open=!1}));let ze=[[`None`,`transparent`],[`Paper`,`var(--bg-2)`],...d.map(e=>[Le(e),`var(--hl-${e})`])];for(let[e,t]of ze){let n=t===`transparent`;R(`#bg-swatches`).appendChild(Pe(e,`background`,n?`var(--bg)`:t,`var(--tx)`,n?`∅`:`A`,()=>{je(t),Ie.open=!1}))}R(`#fg-custom`).addEventListener(`input`,e=>Ae(e.target.value)),R(`#bg-custom`).addEventListener(`input`,e=>je(e.target.value)),document.addEventListener(`click`,e=>{for(let t of L.querySelectorAll(`.pop[open]`))t.contains(e.target)||(t.open=!1)});function Be(e){let t=e&&(e.nodeType===Node.ELEMENT_NODE?e:e.parentElement),n=t?t.closest(`pre`):null;return n&&z.contains(n)?n:null}function Ve(e,t){let n=document.createRange();n.setStart(e,t),n.collapse(!0);let r=getSelection();r.removeAllRanges(),r.addRange(n)}function He(e,t){let n=document.createRange();n.selectNodeContents(e),n.setEnd(t.startContainer,t.startOffset);let r=document.createRange();return r.selectNodeContents(e),r.setStart(t.endContainer,t.endOffset),[n.toString(),r.toString()]}function Ue(e,t){let n=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),r;for(;r=n.nextNode();){let e=r.length;if(t<=e)return[r,t];t-=e}return[e,e.childNodes.length]}function We(e,t){let n=getSelection().getRangeAt(0);n.deleteContents();let r=document.createTextNode(t);n.insertNode(r);let i=document.createRange();i.selectNodeContents(e),i.setStartAfter(r),t.endsWith(`
`)&&i.toString()===``&&r.after(`
`),Ve(r,r.length),j.value++}function Ge(e,t){let n=document.createElement(`p`);if(n.appendChild(document.createElement(`br`)),t===``)e.replaceWith(n);else{let r=document.createRange(),[i,a]=Ue(e,t.length-1);r.setStart(i,a),r.setEnd(e,e.childNodes.length),r.deleteContents(),e.after(n)}Ve(n,0),j.value++}function Ke(e,t){let n=document.createElement(`pre`);t&&(n.dataset.lang=t);let r=document.createElement(`code`),i=document.createTextNode(`
`);r.appendChild(i),n.appendChild(r),e.replaceWith(n),Ve(i,0),j.value++}z.addEventListener(`keydown`,e=>{if(e.isComposing)return;let t=getSelection();if(!t||!t.rangeCount)return;let n=t.getRangeAt(0),r=Be(n.startContainer);if(r){if(e.key===`Tab`&&!e.shiftKey)e.preventDefault(),document.execCommand(`insertText`,!1,`    `);else if(e.key===`Enter`){e.preventDefault();let[i,a]=He(r,n);t.isCollapsed&&(i===``||i.endsWith(`
`))&&a.replace(/\n$/,``)===``&&!e.shiftKey?Ge(r,i):We(r,`
`)}else e.key===`Backspace`&&ue(r)===``&&(e.preventDefault(),Ge(r,``));return}if(e.key===`Enter`&&!e.shiftKey&&t.isCollapsed){let t=Je(n.startContainer),r=t&&/^(P|DIV)$/.test(t.tagName)?(t.textContent||``).replace(/\u200B/g,``).trim().match(/^```([\w+#.-]*)$/):null;r&&(e.preventDefault(),Ke(t,r[1]))}}),document.execCommand(`defaultParagraphSeparator`,!1,`p`);let qe={"#":[`formatBlock`,`h1`],"##":[`formatBlock`,`h2`],"###":[`formatBlock`,`h3`],">":[`formatBlock`,`blockquote`],"-":[`insertUnorderedList`],"*":[`insertUnorderedList`],"1.":[`insertOrderedList`]};function Je(e){for(;e&&e!==z;){if(e.nodeType===Node.ELEMENT_NODE&&/^(P|DIV|H1|H2|H3|LI|BLOCKQUOTE)$/.test(e.tagName))return e;e=e.parentNode}return null}z.addEventListener(`keydown`,e=>{if(e.key!==` `)return;let t=getSelection();if(!t||!t.rangeCount||!t.isCollapsed)return;let n=t.getRangeAt(0),r=Je(n.startContainer);if(!r||!/^(P|DIV)$/.test(r.tagName))return;let i=document.createRange();i.selectNodeContents(r),i.setEnd(n.startContainer,n.startOffset);let a=qe[i.toString()];a&&(e.preventDefault(),t.removeAllRanges(),t.addRange(i),document.execCommand(`delete`),document.execCommand(a[0],!1,a[1]))});let Ye=[[/\*\*([^*\n]+?)\*\*$/,`strong`,`**`],[/__([^_\n]+?)__$/,`strong`,`__`],[/(?:^|[^*])\*([^*\s][^*\n]*?)\*$/,`em`,`*`],[/(?:^|[^_\w])_([^_\s][^_\n]*?)_$/,`em`,`_`],[/`([^`\n]+)`$/,`code`,"`"]];z.addEventListener(`input`,e=>{j.value++;let t=e;if(t.inputType!==`insertText`||!/[*`_]/.test(t.data||``))return;let n=getSelection();if(!n||!n.rangeCount)return;let r=n.getRangeAt(0),i=r.startContainer;if(i.nodeType!==Node.TEXT_NODE||Be(i))return;let a=i,o=a.data.slice(0,r.startOffset);for(let[e,t,i]of Ye){let s=o.match(e);if(!s)continue;let c=s[1],l=r.startOffset-c.length-i.length*2,u=a.splitText(r.startOffset),ee=a.splitText(l),d=document.createElement(t);d.textContent=c,ee.replaceWith(d);let f=document.createTextNode(`​`);d.after(f);let p=document.createRange();p.setStart(f,1),p.collapse(!0),n.removeAllRanges(),n.addRange(p),u.data||u.remove();break}}),z.addEventListener(`paste`,e=>{let t=e.clipboardData&&e.clipboardData.getData(`text/plain`);if(t==null)return;e.preventDefault();let n=Be(getSelection()?.anchorNode??null);n?We(n,t.replace(/\r\n?/g,`
`)):/\n\s*\n|^#{1,3}\s|^\s*[-*]\s|^\s*```/m.test(t)?document.execCommand(`insertHTML`,!1,w(t)):document.execCommand(`insertText`,!1,t)}),R(`#md-open`).addEventListener(`click`,()=>{U.value=de(z);try{H.showModal()}catch{H.setAttribute(`open`,``)}}),R(`#md-cancel`).addEventListener(`click`,()=>H.close()),R(`#md-load`).addEventListener(`click`,()=>{z.innerHTML=w(U.value),H.close(),E.value=null,j.value++,Y(`Editor text replaced.`)}),R(`#md-copy`).addEventListener(`click`,()=>{let e=()=>{U.focus(),U.select(),Y(`Selected. Press Ctrl/⌘ C to copy.`)};try{navigator.clipboard.writeText(U.value).then(()=>Y(`Markdown copied.`),e)}catch{e()}});let Xe=R(`#add-form`);Xe.addEventListener(`submit`,async e=>{e.preventDefault();let t=W.value.trim();if(!t){M.value=`Paste a GitHub link first.`;return}let n=t.split(/[\s,]+/).filter(Boolean).filter(e=>!se(e));if(n.length){M.value=`Not a GitHub link: ${n[0]}`;return}M.value=null,W.value=``,N.value=!0,await Te(t),N.value=!1}),W.addEventListener(`keydown`,e=>{e.key===`Enter`&&(e.metaKey||e.ctrlKey)&&(e.preventDefault(),Xe.requestSubmit())});let $=R(`#file-input`);$.addEventListener(`change`,()=>{$.files&&De($.files),$.value=``});for(let e of[`dragenter`,`dragover`])document.addEventListener(e,e=>{let t=e.dataTransfer;!t||![...t.types].includes(`Files`)||(e.preventDefault(),P._value||(P.value=!0))});for(let e of[`dragleave`,`drop`])document.addEventListener(e,t=>{e===`dragleave`&&t.relatedTarget||(P.value=!1)});document.addEventListener(`drop`,e=>{let t=e.dataTransfer?.files;t?.length&&(e.preventDefault(),De(t))});let Ze=h.get(`draft`,null),Qe=`<p style="font-family:${g(`"tc-${ne(a)}-kalam", cursive`)}">${p.map(g).join(`<br>`)}</p>`;z.innerHTML=Ze||w(f.replace(/\*\*\*([^*]+)\*\*\*/g,`**_$1_**`))+Qe,Ze||z.querySelector(`p`)?.classList.add(`first`),ye.schedule();let $e=h.get(`links`,null);return Te(($e&&$e.length?$e:[r,i,a]).join(`
`)),L}document.body.appendChild(E());