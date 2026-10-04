import{n as e,t}from"./reactor-CUx62Pa_.js";import{t as n}from"./scheduler-DR5rcNf-.js";var r=`https://github.com/nicoverbruggen/ebook-fonts/tree/13834303660d071657b1aa885da02c2d075b5368/fonts/core`,i=`https://github.com/ryanoasis/nerd-fonts/tree/master/patched-fonts/FiraCode`,a=`Libron`,o=`Fira Code Nerd Font Mono`,s=200,c=[{id:`sys-serif`,name:`System serif`,css:`Georgia, "Times New Roman", serif`,faces:[],builtin:!0},{id:`sys-sans`,name:`System sans`,css:`system-ui, -apple-system, "Segoe UI", sans-serif`,faces:[],builtin:!0},{id:`sys-mono`,name:`System mono`,css:`ui-monospace, Menlo, Consolas, monospace`,faces:[],builtin:!0}],l=[[`Regular`,`normal`,400],[`Italic`,`italic`,400],[`Bold`,`normal`,700],[`Bold Italic`,`italic`,700]],u=[`R`,`I`,`B`,`BI`],ee=[`red`,`orange`,`yellow`,`green`,`cyan`,`blue`,`purple`,`magenta`],d=`### CHAPTER I.

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

Code is set in ${o}, ligatures and all:

\`\`\`
a = 2
b = 3
if a >= b:
    println(a - b)
else:
    println(b - a)
\`\`\`

Nerd Font icons work in inline code too: \`\uE0A0 main\`, \`\uF09B github\`.
`,f=`
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
`,p=`typography:v1:`,m={get(e,t){try{let n=localStorage.getItem(p+e);return n==null?t:JSON.parse(n)}catch{return t}},set(e,t){try{localStorage.setItem(p+e,JSON.stringify(t))}catch{}}};function te(e){let t=5381;for(let n=0;n<e.length;n++)t=t*33^e.charCodeAt(n);return(t>>>0).toString(36)}function h(e){return String(e).replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}var g=e=>/\.(ttf|otf|woff2?)$/i.test(e);async function ne(e,t,n){let r=0,i=Array.from({length:Math.min(t,e.length)},async()=>{for(;r<e.length;)await n(e[r++])});await Promise.all(i)}var _=[[`hairline`,100],[`thin`,100],[`extralight`,200],[`ultralight`,200],[`semilight`,350],[`light`,300],[`book`,400],[`regular`,400],[`normal`,400],[`roman`,400],[`retina`,450],[`medium`,500],[`semibold`,600],[`demibold`,600],[`extrabold`,800],[`ultrabold`,800],[`bold`,700],[`extrablack`,950],[`black`,900],[`heavy`,900]],re={100:`Thin`,200:`ExtraLight`,300:`Light`,350:`SemiLight`,400:`Regular`,450:`Retina`,500:`Medium`,600:`SemiBold`,700:`Bold`,800:`ExtraBold`,900:`Black`,950:`ExtraBlack`},v=/^(hairline|thin|extra ?light|ultra ?light|semi ?light|light|book|regular|normal|roman|retina|medium|semi ?bold|demi ?bold|extra ?bold|ultra ?bold|bold|extra ?black|black|heavy)?(italic|oblique|it)?$/i,y=/^(.*?)(hairline|thin|extralight|ultralight|semilight|light|book|regular|normal|roman|retina|medium|semibold|demibold|extrabold|ultrabold|bold|extrablack|black|heavy)?(italic|oblique)?$/i;function ie(e){let t=e.split(`/`).pop().replace(/\.(ttf|otf|woff2?)$/i,``),n=/\[[^\]]*\]|variable|[-_]VF$/i.test(t);t=t.replace(/\[[^\]]*\]/g,``).replace(/[-_ ]?(variablefont|variable|VF)$/i,``).replace(/[-_ ]+$/,``);let r=t,i=``,a=t.lastIndexOf(`-`);if(a>0&&v.test(t.slice(a+1).replace(/[_ ]/g,``)))r=t.slice(0,a),i=t.slice(a+1);else{let e=t.match(y);e&&e[1]&&(e[2]||e[3])&&(r=e[1],i=(e[2]||``)+(e[3]||``))}r=r.replace(/[-_]+$/,``);let o=i.toLowerCase().replace(/[\s_-]/g,``),s=/italic|oblique/.test(o)||/^it$|[a-z]it$/.test(o)&&o!==``,c=400;for(let[e,t]of _)if(o.includes(e)){c=t;break}let l=(/[_\s]/.test(r)?r.replace(/_/g,` `):r.replace(/([a-z])([A-Z])/g,`$1 $2`)).replace(/\s+/g,` `).trim(),u;return u=n?s?`Variable Italic`:`Variable`:c===400?s?`Italic`:`Regular`:re[c]+(s?` Italic`:``),{family:l,key:l.toLowerCase(),weight:n?`100 900`:String(c),style:s?`italic`:`normal`,label:u,sort_w:n?400:c,file:e}}function ae(e){let t=e.trim().replace(/[?#].*$/,``).replace(/\/+$/,``);if(!t)return null;t=t.replace(/^git@github\.com:/,`github.com/`).replace(/\.git$/,``);let n;if(n=t.match(/^(?:https?:\/\/)?raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(.+)$/i))return{owner:n[1],repo:n[2],ref_parts:n[3].split(`/`)};t=t.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i,``);let r=t.split(`/`).filter(Boolean).map(decodeURIComponent);if(r.length<2)return null;let[i,a,o,...s]=r;return o===`tree`||o===`blob`?{owner:i,repo:a,ref_parts:s}:{owner:i,repo:a,path:[o,...s].filter(Boolean).join(`/`)}}var b=class extends Error{kind;constructor(e,t){super(e),this.kind=t}};async function x(e){let t;try{t=await fetch(e,{headers:{Accept:`application/vnd.github+json`}})}catch{throw new b(`blocked`,`network`)}if(t.status===403||t.status===429){let e=Number(t.headers.get(`x-ratelimit-reset`));throw new b(`GitHub's limit for anonymous requests is used up. Try again after ${e?new Date(e*1e3).toLocaleTimeString([],{hour:`numeric`,minute:`2-digit`}):`an hour`}.`,`rate`)}if(t.status===404)return null;if(!t.ok)throw new b(`GitHub answered ${t.status}.`,`http`);return t.json()}async function S(e,t,n){let r=g(n),i=r?n.split(`/`).slice(0,-1).join(`/`):n,a=await x(`${e}/git/trees/${encodeURIComponent(i?`${t}:${i}`:t)}?recursive=1`);if(!a||!a.tree)return null;let o=i?i+`/`:``,s=a.tree.filter(e=>e.type===`blob`&&g(e.path)).map(e=>o+e.path);return r?s.filter(e=>e===n):s}async function oe(e){let t=`https://api.github.com/repos/${e.owner}/${e.repo}`;if(e.ref_parts){for(let n=1;n<=e.ref_parts.length;n++){let r=e.ref_parts.slice(0,n).join(`/`),i=e.ref_parts.slice(n).join(`/`),a=await S(t,r,i);if(a)return{ref:r,path:i,files:a}}throw new b(`Couldn't find that repository, branch or folder. Check the link and that the repo is public.`,`missing`)}let n=await x(t);if(!n)throw new b(`Couldn't find that repository. Check the link and that the repo is public.`,`missing`);let r=n.default_branch,i=e.path||``,a=await S(t,r,i);if(!a)throw new b(`Couldn't find ${i||`the repository's files`}.`,`missing`);return{ref:r,path:i,files:a}}function se(e){let t=ie(e),n=l.findIndex(([,e,n])=>t.style===e&&t.sort_w===n);return n<0?l.length:n}function C(e){return h(e).replace(/`([^`]+)`/g,`<code>$1</code>`).replace(/\*\*([^*]+)\*\*|__([^_]+)__/g,(e,t,n)=>`<strong>${t||n}</strong>`).replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)|(^|[^_\w])_([^_\s][^_]*?)_(?![_\w])/g,(e,t,n,r,i)=>`${t??r??``}<em>${n??i}</em>`).replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,`<a href="$2" target="_blank" rel="noopener">$1</a>`)}function ce(e){let t=e.replace(/\r/g,``).split(`
`),n=[],r=[],i=[],a=null,o=()=>{r.length&&(n.push(`<p>${C(r.join(` `))}</p>`),r=[])},s=()=>{a&&=(n.push(`<${a.tag}>${a.items.map(e=>`<li>${C(e)}</li>`).join(``)}</${a.tag}>`),null)},c=()=>{if(!i.length)return;let e=i.join(`
`).split(/\n\s*\n/).map(e=>e.replace(/\n/g,` `).trim()).filter(Boolean);n.push(`<blockquote>${e.map(e=>`<p${/^(—|--)\s/.test(e)?` class="cite"`:``}>${C(e)}</p>`).join(``)}</blockquote>`),i=[]},l=()=>{o(),s(),c()},u=null;for(let e of t){let t;if(u){/^\s*```\s*$/.test(e)?(n.push(w(u.lines.join(`
`),u.lang)),u=null):u.lines.push(e);continue}if(t=e.match(/^\s*```\s*([\w+#.-]*)\s*$/)){l(),u={lang:t[1],lines:[]};continue}if(!e.trim()){l();continue}if(t=e.match(/^(#{1,3})\s+(.*)$/)){l(),n.push(`<h${t[1].length}>${C(t[2])}</h${t[1].length}>`);continue}if(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/.test(e)){l(),n.push(`<hr>`);continue}if(t=e.match(/^>\s?(.*)$/)){o(),s(),i.push(t[1]);continue}if(t=e.match(/^\s*[-*+]\s+(.*)$/)){o(),c(),(!a||a.tag!==`ul`)&&(s(),a={tag:`ul`,items:[]}),a.items.push(t[1]);continue}if(t=e.match(/^\s*\d+[.)]\s+(.*)$/)){o(),c(),(!a||a.tag!==`ol`)&&(s(),a={tag:`ol`,items:[]}),a.items.push(t[1]);continue}s(),c(),r.push(e.trim())}return l(),u&&n.push(w(u.lines.join(`
`),u.lang)),n.join(`
`)||`<p><br></p>`}function w(e,t=``){return`<pre${t?` data-lang="${h(t)}"`:``}><code>${h(e)}</code></pre>`}function le(e){let t=``,n=e=>{if(e.nodeType===Node.TEXT_NODE){t+=e.data;return}if(e.nodeType!==Node.ELEMENT_NODE)return;let r=e.tagName;if(r===`BR`){t+=`
`;return}(r===`DIV`||r===`P`)&&t&&!t.endsWith(`
`)&&(t+=`
`),e.childNodes.forEach(n)};return n(e),t.replace(/\u200B/g,``).replace(/\n$/,``)}function ue(e){let t=e=>{if(e.nodeType===Node.TEXT_NODE)return e.data.replace(/\u200B/g,``);if(e.nodeType!==Node.ELEMENT_NODE)return``;let n=e,r=[...n.childNodes].map(t).join(``);switch(n.tagName){case`STRONG`:case`B`:return r.trim()?`**${r}**`:r;case`EM`:case`I`:return r.trim()?`*${r}*`:r;case`CODE`:return"`"+r+"`";case`A`:return`[${r}](${n.getAttribute(`href`)})`;case`BR`:return`
`;default:return r}},n=[];for(let r of e.childNodes){if(r.nodeType===Node.TEXT_NODE){let e=r.data.trim();e&&n.push(e);continue}if(r.nodeType!==Node.ELEMENT_NODE)continue;let e=r,i=e.tagName;if(/^H[1-3]$/.test(i))n.push(`#`.repeat(+i[1])+` `+t(e).trim());else if(i===`BLOCKQUOTE`){let r=e.querySelector(`:scope > p`)?[...e.children].map(e=>t(e).trim()):[t(e).trim()];n.push(r.filter(Boolean).join(`

`).split(`
`).map(e=>e?`> `+e:`>`).join(`
`))}else i===`UL`||i===`OL`?n.push([...e.children].map((e,n)=>(i===`UL`?`- `:`${n+1}. `)+t(e).trim()).join(`
`)):i===`HR`?n.push(`---`):i===`PRE`?n.push("```"+(e.dataset.lang||``)+`
`+le(e)+"\n```"):n.push(t(e).trim())}return n.filter(Boolean).join(`

`)+`
`}function T(){let p=n(),_=p.getOrCreate(`render`),re=p.getOrCreate(`sync`),v=e(m.get(`theme`,`system`)),y=e([]),x=e([]),S=e(c[0]),C=e(null),w=e(c[0]),T=e(null),E=e(null),D=e(``),O=e(``),k=e(`var(--tx)`),de=e(`var(--hl-yellow)`),A=e(0),j=e(null),M=e(!1),N=e(!1),P=e(null),fe=0,pe=0,F=null,I=document.createElement(`div`);I.className=`typography`,I.innerHTML=f;let L=e=>I.querySelector(e),R=L(`#editor`),z=L(`#family`),B=L(`#size`),me=[...I.querySelectorAll(`[data-theme-set]`)],V=L(`#md-dialog`),H=L(`#md-text`),U=L(`#repo-input`),he=L(`#drop`),ge=()=>[...x._value,...c],_e=e=>ge().find(t=>t.id===e),W=e=>!!e&&(e===R||R.contains(e));function G(){let e=T._value;return!!e&&!e.collapsed&&W(e.commonAncestorContainer)}function K(){let e=T._value;if(!e)return!1;R.focus({preventScroll:!0});let t=getSelection();return t.removeAllRanges(),t.addRange(e),!0}function q(e){S.value=e,w.value=e}function J(e){P.value=e}t(()=>{let e=v.value;e===`system`?document.documentElement.removeAttribute(`data-theme`):document.documentElement.setAttribute(`data-theme`,e);for(let t of me)t.setAttribute(`aria-pressed`,String(t.dataset.themeSet===e));m.set(`theme`,e)}),t(()=>{let e=y.value,t=L(`#source-list`);t.innerHTML=e.length?``:`<li class="empty">No sources yet. Paste a GitHub folder link above.</li>`;for(let n of e){let e=document.createElement(`li`);e.className=`source`,e.dataset.state=n.state,e.innerHTML=`<div class="path"><b>${h(n.label)}</b>${n.sub?`<br>${h(n.sub)}`:``}</div>
                <button class="x" type="button" aria-label="Remove ${h(n.label)}" title="Remove">×</button>
                <div class="meta"><span class="dot"></span><span>${h(n.note)}</span></div>`,e.querySelector(`.x`).addEventListener(`click`,()=>Te(n)),t.appendChild(e)}L(`#src-count`).textContent=e.length?String(e.length):``},{reaction_schedule:_}),t(()=>{m.set(`links`,y.value.filter(e=>e.kind===`github`).map(e=>e.link))},{deps:[y],reaction_schedule:_}),t(()=>{let e=x.value,t=S.value,n=L(`#fam-list`);n.innerHTML=e.length?``:`<li class="empty">Families appear here once a source loads.</li>`;for(let r of e){let e=document.createElement(`li`);e.innerHTML=`<button class="fam" type="button" aria-current="${t.id===r.id}">
                <span class="nm" style="font-family:${h(r.css)}">${h(r.name)}</span>
                <span class="faces">${ye(r)}</span></button>`,e.firstElementChild.addEventListener(`click`,()=>Oe(r.id)),n.appendChild(e)}L(`#fam-count`).textContent=e.length?String(e.length):``},{reaction_schedule:_}),t(()=>{let e=x.value,t=z.value;z.innerHTML=``;for(let t of y._value){let n=e.filter(e=>e.source_id===t.id);if(!n.length)continue;let r=document.createElement(`optgroup`);r.label=t.label+(t.sub?` · `+t.sub:``);for(let e of n)r.appendChild(new Option(`${e.name}  (${e.faces.length})`,e.id));z.appendChild(r)}let n=document.createElement(`optgroup`);n.label=`System`;for(let e of c)n.appendChild(new Option(e.name,e.id));z.appendChild(n),z.value=t&&_e(t)?t:S._value.id},{reaction_schedule:_}),t(()=>{R.style.fontFamily=S.value.css},{reaction_schedule:_}),t(()=>{let e=C.value;e?R.style.setProperty(`--code-font`,`"${e.css_name}", ui-monospace, Menlo, Consolas, monospace`):R.style.removeProperty(`--code-font`)},{reaction_schedule:_}),t(()=>{R.style.fontSize=E.value?E.value+`px`:``},{reaction_schedule:_}),t(()=>{R.style.color=D.value},{reaction_schedule:_}),t(()=>{R.style.backgroundColor=O.value},{reaction_schedule:_}),t(()=>{L(`#fg-chip`).style.background=k.value},{reaction_schedule:_}),t(()=>{L(`#bg-chip`).style.background=de.value},{reaction_schedule:_}),t(()=>{let e=w.value;x.value;let t=y._value.find(t=>t.id===e.source_id),n;if(e.builtin)n=`<span class="facetag">Browser default faces</span>`;else{let t=new Set;n=l.map(([n,r,i])=>{let a=e.faces.find(e=>e.style===r&&e.sort_w===i);return a&&t.add(a.label),`<span class="facetag${a?``:` missing`}" style="font-family:${h(e.css)};font-style:${r};font-weight:${i}" title="${a?h(a.file):`Not in this source; the browser will fake it`}">${n}</span>`}).join(``)+e.faces.filter(e=>!t.has(e.label)).map(t=>`<span class="facetag" style="font-family:${h(e.css)};font-style:${t.style};font-weight:${t.sort_w}" title="${h(t.file)}">${h(t.label)}</span>`).join(``)}L(`#facebar`).innerHTML=`<span class="fname">${h(e.name)}</span>${n}${t?`<span class="src">${h(t.label)}${t.sub?` · `+h(t.sub):``}</span>`:``}`,L(`#stat-font`).textContent=`${e.name}${e.builtin?``:` · ${e.faces.length} faces`}`},{reaction_schedule:_});let ve=t(()=>{let e=(R.innerText.replace(/\u200B/g,``).match(/\S+/g)||[]).length;L(`#stat-words`).textContent=`${e} words`},{deps:[A],reaction_schedule:_});t(()=>{let e=setTimeout(()=>m.set(`draft`,R.innerHTML),600);return()=>clearTimeout(e)},{deps:[A]}),t(()=>{let e=T.value,t=G(),n=L(`#scope`);n.textContent=t?`selection`:`whole document`,n.classList.toggle(`sel`,t);let r=e?e.startContainer:null;r&&r.nodeType===Node.TEXT_NODE&&(r=r.parentElement),(!r||!W(r))&&(r=R);let i=r,a=getComputedStyle(i);B.value=String(Math.round(parseFloat(a.fontSize)));let o=a.fontFamily.split(`,`)[0].replace(/["']/g,``).trim();z.value=(x.value.find(e=>e.css_name===o)??S.value).id,L(`#bold`).setAttribute(`aria-pressed`,String(Number(a.fontWeight)>=600&&i!==R&&!/^H[1-3]$/.test(i.tagName))),L(`#italic`).setAttribute(`aria-pressed`,String(a.fontStyle===`italic`&&i.tagName!==`BLOCKQUOTE`))},{deps:[T,x,S],reaction_schedule:re}),t(()=>{let e=L(`#fetch-msg`);e.hidden=!j.value,e.textContent=j.value??``}),t(()=>{L(`#fetch-btn`).disabled=M.value}),t(()=>{he.classList.toggle(`over`,N.value)}),t(()=>{let e=L(`#toast`),t=P.value;if(e.hidden=!t,!t)return;e.textContent=t;let n=setTimeout(()=>{P.value=null},2600);return()=>clearTimeout(n)});function ye(e){let t=u.filter((t,n)=>e.faces.some(e=>e.style===l[n][1]&&e.sort_w===l[n][2])),n=e.faces.length-t.length;return t.map(e=>`<span class="facepip">${e}</span>`).join(``)+(n>0?`<span class="facepip">+${n}</span>`:``)}async function be(e,t,n){let r=ie(t),i=x._value.find(t=>t.source_id===e.id&&t.key===r.key);if(!i){let t=`tc-${te(e.link||`local`)}-${r.key.replace(/[^a-z0-9]+/g,`-`)}`;i={id:`f`+ ++fe,name:r.family,key:r.key,css_name:t,css:`"${t}", Georgia, serif`,source_id:e.id,faces:[]},x._value.push(i)}let a=new FontFace(i.css_name,n,{weight:r.weight,style:r.style});return await a.load(),document.fonts.add(a),!C._value&&i.name===o&&(C.value=i),i.faces.some(e=>e.label===r.label)||i.faces.push(r),i.faces.sort((e,t)=>e.sort_w-t.sort_w||Number(e.style===`italic`)-Number(t.style===`italic`)),i}function Y(e,t,n){e.state=t,e.note=n,y.trigger()}function xe(e){return x._value.filter(t=>t.source_id===e.id).length}function Se(e,t){let n=xe(e);if(Y(e,`ok`,`${n} ${n===1?`family`:`families`} · ${t} files`),x.trigger(),S._value.builtin){let t=x._value.filter(t=>t.source_id===e.id),n=t.find(e=>e.name===a)||t.find(e=>!/\b(code|mono)\b/i.test(e.name))||(e.link===i?void 0:t[0]);n&&q(n)}}async function Ce(e){let t=ae(e.link);if(!t){Y(e,`error`,`That doesn't look like a GitHub link.`);return}e.label=`${t.owner}/${t.repo}`,Y(e,`loading`,`Reading folder…`);try{let{ref:n,path:r,files:i}=await oe(t);if(e.sub=`${r||`/`} @ ${/^[0-9a-f]{40}$/.test(n)?n.slice(0,7):n}`,!i.length)throw new b(`No .ttf, .otf, .woff or .woff2 files under ${r||`the repo root`}.`,`empty`);if(i.length>s)throw new b(`That folder holds ${i.length} font files. Point to a smaller subfolder.`,`big`);i.sort((e,t)=>se(e)-se(t));let a=`https://raw.githubusercontent.com/${t.owner}/${t.repo}/${n.split(`/`).map(encodeURIComponent).join(`/`)}/`,o=0;await ne(i,5,async t=>{let n;try{n=await fetch(a+t.split(`/`).map(encodeURIComponent).join(`/`))}catch{throw new b(`blocked`,`network`)}if(!n.ok)throw new b(`Couldn't download ${t.split(`/`).pop()} (${n.status}).`,`http`);try{await be(e,t,await n.arrayBuffer())}catch(e){console.warn(`Skipped unreadable font`,t,e)}Y(e,`loading`,`Loading ${++o} of ${i.length} files…`)}),Se(e,i.length)}catch(t){Y(e,`error`,t instanceof b&&t.kind===`network`?`Couldn't reach GitHub. Check your connection, or drop the font files below.`:t instanceof Error&&t.message||`Something went wrong while loading.`)}}function we(e){let t=e.split(/[\s,]+/).map(e=>e.trim()).filter(Boolean),n=[];for(let e of t){if(y._value.some(t=>t.link===e))continue;let t={id:`s`+ ++pe,link:e,label:e,state:`loading`,note:``,kind:`github`};y._value.push(t),n.push(t)}return y.trigger(),Promise.all(n.map(Ce))}function Te(e){e===F&&(F=null),y.value=y._value.filter(t=>t!==e),x.value=x._value.filter(t=>t.source_id!==e.id),S._value.source_id===e.id?q(x._value[0]||c[0]):w._value.source_id===e.id&&(w.value=S._value),C._value?.source_id===e.id&&(C.value=null)}async function Ee(e){let t=[...e].filter(e=>g(e.name));if(!t.length){J(`Those weren't font files (.ttf, .otf, .woff, .woff2).`);return}F||(F={id:`s`+ ++pe,link:``,label:`Your files`,sub:`added in this browser`,state:`loading`,note:``,kind:`local`},y._value.push(F));let n=F;Y(n,`loading`,`Loading ${t.length} files…`);let r=0;for(let e of t)try{await be(n,e.name,await e.arrayBuffer()),r++}catch(t){console.warn(`Skipped`,e.name,t)}let i=xe(n);r?Y(n,`ok`,`${i} ${i===1?`family`:`families`} · ${r} files`):Y(n,`error`,`None of those files could be read as fonts.`),x.trigger();let a=x._value.filter(e=>e.source_id===n.id).pop();a&&q(a)}function De(e){let t=e.commonAncestorContainer;if(t.nodeType===Node.TEXT_NODE)return[t];let n=[],r=document.createTreeWalker(t,NodeFilter.SHOW_TEXT),i;for(;i=r.nextNode();)i.data.length&&e.intersectsNode(i)&&n.push(i);return n}function X(e){if(!G())return!1;let t=T._value,n=De(t).map(e=>({n:e,s:e===t.startContainer?t.startOffset:0,e:e===t.endContainer?t.endOffset:e.data.length})).filter(e=>e.e>e.s);if(!n.length)return!1;let r=[];for(let t of n){let n=t.n;t.e<n.data.length&&n.splitText(t.e),t.s>0&&(n=n.splitText(t.s));let i=n.parentElement,a;i.classList.contains(`tc`)&&i.childNodes.length===1?a=i:(a=document.createElement(`span`),a.className=`tc`,i.insertBefore(a,n),a.appendChild(n));for(let[t,n]of Object.entries(e))n==null?a.style.removeProperty(t):a.style.setProperty(t,n);r.push(n)}let i=document.createRange();i.setStart(r[0],0);let a=r[r.length-1];return i.setEnd(a,a.data.length),T.value=i,K(),!0}function Oe(e){let t=_e(e);t&&(X({"font-family":t.css})?w.value=t:q(t))}function Z(e){e=Math.max(8,Math.min(160,Math.round(e)||20)),B.value=String(e),X({"font-size":e+`px`})||(E.value=e)}function ke(e){k.value=e,X({color:e})||(D.value=e)}function Ae(e){let t=e===`transparent`;de.value=t?`var(--ui-2)`:e,X({"background-color":t?null:e,"border-radius":t?null:`0.15em`})||(O.value=t?``:e)}function je(e){K(),document.execCommand(`styleWithCSS`,!1,`false`),document.execCommand(e),T.trigger()}function Me(){if(G()){K(),document.execCommand(`removeFormat`);let e=getSelection(),t=e.rangeCount?e.getRangeAt(0):null;t&&R.querySelectorAll(`span.tc`).forEach(e=>{t.intersectsNode(e)&&e.removeAttribute(`style`)})}else R.querySelectorAll(`span.tc`).forEach(e=>e.replaceWith(...e.childNodes)),D.value=``,O.value=``,k.value=`var(--tx)`,J(`Cleared colors, sizes and fonts set on parts of the text.`);T.trigger()}for(let e of me)e.addEventListener(`click`,()=>{v.value=e.dataset.themeSet});document.addEventListener(`selectionchange`,()=>{let e=getSelection();e&&e.rangeCount&&W(e.anchorNode)&&(T.value=e.getRangeAt(0).cloneRange())}),document.addEventListener(`pointerdown`,e=>{e.target.closest?.(`.toolbar, .sheet, .mdlg`)||(T.value=null)}),I.querySelectorAll(`.toolbar button, .toolbar summary`).forEach(e=>e.addEventListener(`mousedown`,e=>e.preventDefault())),z.addEventListener(`change`,()=>Oe(z.value)),B.addEventListener(`change`,()=>Z(Number(B.value))),B.addEventListener(`keydown`,e=>{e.key===`Enter`&&(e.preventDefault(),Z(Number(B.value)))}),L(`#size-down`).addEventListener(`click`,()=>Z(Number(B.value)-2)),L(`#size-up`).addEventListener(`click`,()=>Z(Number(B.value)+2)),L(`#bold`).addEventListener(`click`,()=>je(`bold`)),L(`#italic`).addEventListener(`click`,()=>je(`italic`)),L(`#clear`).addEventListener(`click`,Me);function Ne(e,t,n,r,i,a){let o=document.createElement(`button`);return o.type=`button`,o.className=`sw`,o.title=e,o.setAttribute(`aria-label`,`${e} ${t}`),o.style.background=n,o.style.color=r,o.textContent=i,o.addEventListener(`mousedown`,e=>e.preventDefault()),o.addEventListener(`click`,a),o}let Pe=L(`#fg-pop`),Fe=L(`#bg-pop`),Ie=e=>e[0].toUpperCase()+e.slice(1),Le=[[`Text`,`var(--tx)`],[`Muted`,`var(--tx-2)`],...ee.map(e=>[Ie(e),`var(--${e})`])];for(let[e,t]of Le)L(`#fg-swatches`).appendChild(Ne(e,`text`,`var(--bg)`,t,`A`,()=>{ke(t),Pe.open=!1}));let Re=[[`None`,`transparent`],[`Paper`,`var(--bg-2)`],...ee.map(e=>[Ie(e),`var(--hl-${e})`])];for(let[e,t]of Re){let n=t===`transparent`;L(`#bg-swatches`).appendChild(Ne(e,`background`,n?`var(--bg)`:t,`var(--tx)`,n?`∅`:`A`,()=>{Ae(t),Fe.open=!1}))}L(`#fg-custom`).addEventListener(`input`,e=>ke(e.target.value)),L(`#bg-custom`).addEventListener(`input`,e=>Ae(e.target.value)),document.addEventListener(`click`,e=>{for(let t of I.querySelectorAll(`.pop[open]`))t.contains(e.target)||(t.open=!1)});function ze(e){let t=e&&(e.nodeType===Node.ELEMENT_NODE?e:e.parentElement),n=t?t.closest(`pre`):null;return n&&R.contains(n)?n:null}function Be(e,t){let n=document.createRange();n.setStart(e,t),n.collapse(!0);let r=getSelection();r.removeAllRanges(),r.addRange(n)}function Ve(e,t){let n=document.createRange();n.selectNodeContents(e),n.setEnd(t.startContainer,t.startOffset);let r=document.createRange();return r.selectNodeContents(e),r.setStart(t.endContainer,t.endOffset),[n.toString(),r.toString()]}function He(e,t){let n=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),r;for(;r=n.nextNode();){let e=r.length;if(t<=e)return[r,t];t-=e}return[e,e.childNodes.length]}function Ue(e,t){let n=getSelection().getRangeAt(0);n.deleteContents();let r=document.createTextNode(t);n.insertNode(r);let i=document.createRange();i.selectNodeContents(e),i.setStartAfter(r),t.endsWith(`
`)&&i.toString()===``&&r.after(`
`),Be(r,r.length),A.value++}function We(e,t){let n=document.createElement(`p`);if(n.appendChild(document.createElement(`br`)),t===``)e.replaceWith(n);else{let r=document.createRange(),[i,a]=He(e,t.length-1);r.setStart(i,a),r.setEnd(e,e.childNodes.length),r.deleteContents(),e.after(n)}Be(n,0),A.value++}function Ge(e,t){let n=document.createElement(`pre`);t&&(n.dataset.lang=t);let r=document.createElement(`code`),i=document.createTextNode(`
`);r.appendChild(i),n.appendChild(r),e.replaceWith(n),Be(i,0),A.value++}R.addEventListener(`keydown`,e=>{if(e.isComposing)return;let t=getSelection();if(!t||!t.rangeCount)return;let n=t.getRangeAt(0),r=ze(n.startContainer);if(r){if(e.key===`Tab`&&!e.shiftKey)e.preventDefault(),document.execCommand(`insertText`,!1,`    `);else if(e.key===`Enter`){e.preventDefault();let[i,a]=Ve(r,n);t.isCollapsed&&(i===``||i.endsWith(`
`))&&a.replace(/\n$/,``)===``&&!e.shiftKey?We(r,i):Ue(r,`
`)}else e.key===`Backspace`&&le(r)===``&&(e.preventDefault(),We(r,``));return}if(e.key===`Enter`&&!e.shiftKey&&t.isCollapsed){let t=qe(n.startContainer),r=t&&/^(P|DIV)$/.test(t.tagName)?(t.textContent||``).replace(/\u200B/g,``).trim().match(/^```([\w+#.-]*)$/):null;r&&(e.preventDefault(),Ge(t,r[1]))}}),document.execCommand(`defaultParagraphSeparator`,!1,`p`);let Ke={"#":[`formatBlock`,`h1`],"##":[`formatBlock`,`h2`],"###":[`formatBlock`,`h3`],">":[`formatBlock`,`blockquote`],"-":[`insertUnorderedList`],"*":[`insertUnorderedList`],"1.":[`insertOrderedList`]};function qe(e){for(;e&&e!==R;){if(e.nodeType===Node.ELEMENT_NODE&&/^(P|DIV|H1|H2|H3|LI|BLOCKQUOTE)$/.test(e.tagName))return e;e=e.parentNode}return null}R.addEventListener(`keydown`,e=>{if(e.key!==` `)return;let t=getSelection();if(!t||!t.rangeCount||!t.isCollapsed)return;let n=t.getRangeAt(0),r=qe(n.startContainer);if(!r||!/^(P|DIV)$/.test(r.tagName))return;let i=document.createRange();i.selectNodeContents(r),i.setEnd(n.startContainer,n.startOffset);let a=Ke[i.toString()];a&&(e.preventDefault(),t.removeAllRanges(),t.addRange(i),document.execCommand(`delete`),document.execCommand(a[0],!1,a[1]))});let Je=[[/\*\*([^*\n]+?)\*\*$/,`strong`,`**`],[/__([^_\n]+?)__$/,`strong`,`__`],[/(?:^|[^*])\*([^*\s][^*\n]*?)\*$/,`em`,`*`],[/(?:^|[^_\w])_([^_\s][^_\n]*?)_$/,`em`,`_`],[/`([^`\n]+)`$/,`code`,"`"]];R.addEventListener(`input`,e=>{A.value++;let t=e;if(t.inputType!==`insertText`||!/[*`_]/.test(t.data||``))return;let n=getSelection();if(!n||!n.rangeCount)return;let r=n.getRangeAt(0),i=r.startContainer;if(i.nodeType!==Node.TEXT_NODE||ze(i))return;let a=i,o=a.data.slice(0,r.startOffset);for(let[e,t,i]of Je){let s=o.match(e);if(!s)continue;let c=s[1],l=r.startOffset-c.length-i.length*2,u=a.splitText(r.startOffset),ee=a.splitText(l),d=document.createElement(t);d.textContent=c,ee.replaceWith(d);let f=document.createTextNode(`​`);d.after(f);let p=document.createRange();p.setStart(f,1),p.collapse(!0),n.removeAllRanges(),n.addRange(p),u.data||u.remove();break}}),R.addEventListener(`paste`,e=>{let t=e.clipboardData&&e.clipboardData.getData(`text/plain`);if(t==null)return;e.preventDefault();let n=ze(getSelection()?.anchorNode??null);n?Ue(n,t.replace(/\r\n?/g,`
`)):/\n\s*\n|^#{1,3}\s|^\s*[-*]\s|^\s*```/m.test(t)?document.execCommand(`insertHTML`,!1,ce(t)):document.execCommand(`insertText`,!1,t)}),L(`#md-open`).addEventListener(`click`,()=>{H.value=ue(R);try{V.showModal()}catch{V.setAttribute(`open`,``)}}),L(`#md-cancel`).addEventListener(`click`,()=>V.close()),L(`#md-load`).addEventListener(`click`,()=>{R.innerHTML=ce(H.value),V.close(),T.value=null,A.value++,J(`Editor text replaced.`)}),L(`#md-copy`).addEventListener(`click`,()=>{let e=()=>{H.focus(),H.select(),J(`Selected. Press Ctrl/⌘ C to copy.`)};try{navigator.clipboard.writeText(H.value).then(()=>J(`Markdown copied.`),e)}catch{e()}});let Ye=L(`#add-form`);Ye.addEventListener(`submit`,async e=>{e.preventDefault();let t=U.value.trim();if(!t){j.value=`Paste a GitHub link first.`;return}let n=t.split(/[\s,]+/).filter(Boolean).filter(e=>!ae(e));if(n.length){j.value=`Not a GitHub link: ${n[0]}`;return}j.value=null,U.value=``,M.value=!0,await we(t),M.value=!1}),U.addEventListener(`keydown`,e=>{e.key===`Enter`&&(e.metaKey||e.ctrlKey)&&(e.preventDefault(),Ye.requestSubmit())});let Q=L(`#file-input`);Q.addEventListener(`change`,()=>{Q.files&&Ee(Q.files),Q.value=``});for(let e of[`dragenter`,`dragover`])document.addEventListener(e,e=>{let t=e.dataTransfer;!t||![...t.types].includes(`Files`)||(e.preventDefault(),N._value||(N.value=!0))});for(let e of[`dragleave`,`drop`])document.addEventListener(e,t=>{e===`dragleave`&&t.relatedTarget||(N.value=!1)});document.addEventListener(`drop`,e=>{let t=e.dataTransfer?.files;t?.length&&(e.preventDefault(),Ee(t))});let Xe=m.get(`draft`,null);R.innerHTML=Xe||ce(d.replace(/\*\*\*([^*]+)\*\*\*/g,`**_$1_**`)),Xe||R.querySelector(`p`)?.classList.add(`first`),ve.schedule();let $=m.get(`links`,null);return we(($&&$.length?$:[r,i]).join(`
`)),I}document.body.appendChild(T());