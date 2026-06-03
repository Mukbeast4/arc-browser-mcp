export const SNAPSHOT_JS =
  `(function(){var sel='a,button,input,select,textarea,summary,label,[role=button],[role=link],[role=checkbox],[role=radio],[role=tab],[role=menuitem],[role=switch],[onclick],[contenteditable]';var nodes=[].slice.call(document.querySelectorAll(sel));var out=[],i=0;for(var n=0;n<nodes.length;n++){var el=nodes[n];var s=window.getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')continue;if(el.getAttribute('aria-hidden')==='true')continue;var r=el.getBoundingClientRect();if(r.width===0&&r.height===0)continue;var ref=String(i++);el.setAttribute('data-arcmcp-ref',ref);var role=el.getAttribute('role')||el.tagName.toLowerCase();var rv=(el.tagName==='INPUT'&&(el.type==='password'||el.type==='hidden'))?'':(el.value||'');var raw=el.getAttribute('aria-label')||el.getAttribute('placeholder')||rv||el.innerText||el.textContent||el.getAttribute('title')||'';var name=raw.replace(/\\s+/g,' ').trim().slice(0,80);out.push('['+ref+'] '+role+(name?' '+JSON.stringify(name):''));if(i>=400)break;}return{url:location.href,title:document.title,count:i,tree:out.join('\\n')};})()`;

export function clickJs(ref: string): string {
  return `(function(){var el=document.querySelector('[data-arcmcp-ref="${ref}"]');if(!el)throw new Error('stale_ref ${ref}: element not found, run arc_snapshot again');el.scrollIntoView({block:'center',inline:'center'});el.click();return true;})()`;
}

export function fillJs(ref: string, value: string): string {
  const v = JSON.stringify(value);
  return `(function(){var el=document.querySelector('[data-arcmcp-ref="${ref}"]');if(!el)throw new Error('stale_ref ${ref}: element not found, run arc_snapshot again');el.focus();var p=el.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;var d=Object.getOwnPropertyDescriptor(p,'value');if(d&&d.set){d.set.call(el,${v});}else{el.value=${v};}el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`;
}

export function typeJs(ref: string, text: string, submit: boolean): string {
  const v = JSON.stringify(text);
  const sub = submit
    ? `if(el.form&&el.form.requestSubmit){el.form.requestSubmit();}else{el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:13,bubbles:true}));el.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',keyCode:13,bubbles:true}));}`
    : "";
  return `(function(){var el=document.querySelector('[data-arcmcp-ref="${ref}"]');if(!el)throw new Error('stale_ref ${ref}: element not found, run arc_snapshot again');el.focus();var p=el.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;var d=Object.getOwnPropertyDescriptor(p,'value');if(d&&d.set){d.set.call(el,${v});}else{el.value=${v};}el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));${sub}return true;})()`;
}

export const GET_TEXT_JS = `((document.body?document.body.innerText:'')||'').slice(0,20000)`;

export function evalExprJs(expression: string): string {
  return `(function(){return (${expression});})()`;
}

export function waitTextJs(text: string): string {
  return `(((document.body?document.body.innerText:'')||'').indexOf(${JSON.stringify(text)})>=0)`;
}
