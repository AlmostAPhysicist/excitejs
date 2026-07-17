import{n as e,t}from"./reactor-CUx62Pa_.js";function n(){let e=document.createElement(`div`);return e.className=`toggleWrapper`,e.innerHTML=`
  <input class="input" id="dn" type="checkbox" />
  <label class="toggle" for="dn">
    <span class="toggle__handler">
      <span class="crater crater--1"></span>
      <span class="crater crater--2"></span>
      <span class="crater crater--3"></span>
    </span>
    <span class="star star--1"></span>
    <span class="star star--2"></span>
    <span class="star star--3"></span>
    <span class="star star--4"></span>
    <span class="star star--5"></span>
    <span class="star star--6"></span>
  </label>
    `,e}function r(){let r=window.matchMedia(`(prefers-color-scheme: dark)`).matches,i=e(`light`),a=document.createElement(`div`);t(()=>{let e=i.value;a.className=`page ${e}`,c.checked=e===`dark`});let o=document.createElement(`div`);o.className=`toggle-wrapper-top-right`;let s=n(),c=s.querySelector(`input`);o.appendChild(s),c.addEventListener(`change`,()=>{i.value=c.checked?`dark`:`light`}),a.appendChild(o);let l=document.createElement(`div`);return l.className=`content`,l.innerHTML=`
    <h1 style="margin-bottom: 20px;">Themed Page</h1>
    <p>Toggle the switch to change the theme.</p>
  `,a.appendChild(l),window.matchMedia(`(prefers-color-scheme: dark)`).addEventListener(`change`,e=>{c.click()}),r&&c.click(),a}document.body.appendChild(r());