import type { CodeBlockType } from '@/components/Widget/Widget'
import { widgetCaptures } from '@/lib/yjs/maps'

const W = 640
const H = 480
const RENDER_DELAY = 2500
const TIMEOUT = RENDER_DELAY + 8000

/**
 * Return a persisted capture for this widget, or `null` if none.
 */
export function getPersistedCapture(widgetId: string): string | null {
  return widgetCaptures.get(widgetId) ?? null
}

/**
 * Persist a capture data-URL for rapid loading on next visit.
 */
export function persistCapture(widgetId: string, dataUrl: string): void {
  widgetCaptures.set(widgetId, dataUrl)
}

/**
 * Generate a 640×480 PNG data-URL preview of a widget's content.
 *
 * Renders code in a hidden sandboxed iframe so scripts, CSS, and
 * animations execute faithfully. After a 2.5 s rendering delay,
 * the capture script inside the iframe snapshots the result and
 * posts it back to the main page via `postMessage`.
 *
 * Returns `null` for unsupported widget types or on capture failure.
 */
export function generateWidgetCapture(
  code: string,
  widgetType: CodeBlockType,
): Promise<string | null> {
  if (widgetType !== 'svg' && widgetType !== 'html')
    return Promise.resolve(null)
  return captureViaIframe(code, widgetType)
}

// ── Iframe-based capture ────────────────────────────────────────────────

function captureViaIframe(
  code: string,
  widgetType: CodeBlockType,
): Promise<string | null> {
  return new Promise((resolve) => {
    const nonce = crypto.randomUUID()

    // Hidden iframe – positioned off-screen, non-interactive
    const iframe = document.createElement('iframe')
    iframe.style.cssText = `position:fixed;left:-10000px;top:-10000px;width:${W}px;height:${H}px;border:none;opacity:0;pointer-events:none;`
    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.tabIndex = -1

    const bodyStyle =
      widgetType === 'svg'
        ? 'margin:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff'
        : 'margin:0;padding:8px;overflow:hidden;background:#fff;font-family:system-ui,-apple-system,sans-serif;font-size:14px;box-sizing:border-box'

    iframe.srcdoc = [
      '<!DOCTYPE html><html><head><meta charset="utf-8">',
      `<style>*{box-sizing:border-box}body{${bodyStyle};width:${W}px;height:${H}px}</style>`,
      `</head><body>${code}`,
      buildCaptureScript(nonce, widgetType),
      '</body></html>',
    ].join('')

    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      iframe.remove()
    }

    const timer = setTimeout(() => {
      cleanup()
      resolve(null)
    }, TIMEOUT)

    const onMessage = (e: MessageEvent) => {
      const d = e.data
      if (d?.type !== 'widget-capture' || d?.nonce !== nonce) return
      clearTimeout(timer)
      cleanup()
      resolve(typeof d.dataUrl === 'string' ? d.dataUrl : null)
    }

    window.addEventListener('message', onMessage)
    document.body.appendChild(iframe)
  })
}

// ── Capture scripts (injected into the iframe) ──────────────────────────

function buildCaptureScript(nonce: string, widgetType: CodeBlockType): string {
  // Self-contained script that runs inside the sandboxed iframe.
  // After RENDER_DELAY ms it captures the rendered content and
  // posts the PNG data-URL back to the parent frame.
  return `<script>(function(){
var W=${W},H=${H},N="${nonce}";
function send(u){window.parent.postMessage({type:"widget-capture",nonce:N,dataUrl:u},"*")}
${widgetType === 'svg' ? CAPTURE_SVG_FN : CAPTURE_HTML_FN}
setTimeout(function(){try{capture()}catch(e){send(null)}},${RENDER_DELAY});
})()</script>`
}

/** SVG capture: extract the rendered <svg>, serialize, draw via Image→Canvas. */
const CAPTURE_SVG_FN = `function capture(){
  var el=document.querySelector("svg");
  if(!el){send(null);return}
  if(!el.getAttribute("viewBox")){
    var vw=parseFloat(el.getAttribute("width"))||W;
    var vh=parseFloat(el.getAttribute("height"))||H;
    el.setAttribute("viewBox","0 0 "+vw+" "+vh);
  }
  el.setAttribute("width",W);
  el.setAttribute("height",H);
  var str=new XMLSerializer().serializeToString(el);
  var img=new Image();
  img.onload=function(){
    var c=document.createElement("canvas");c.width=W;c.height=H;
    var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,W,H);
    x.drawImage(img,0,0,W,H);send(c.toDataURL("image/png"));
  };
  img.onerror=function(){send(null)};
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(str);
}`

/**
 * HTML capture: walk the live DOM, draw backgrounds / images / text to
 * a canvas.  This avoids the foreignObject restriction in Chrome while
 * still reflecting the actual rendered layout (since JS and CSS have
 * already been applied in the iframe).
 */
const CAPTURE_HTML_FN = `function capture(){
  var c=document.createElement("canvas");c.width=W;c.height=H;
  var x=c.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,W,H);

  /* 1. Backgrounds, borders, images, canvases */
  var els=document.body.querySelectorAll("*");
  for(var i=0;i<els.length;i++){
    var el=els[i],tag=el.tagName;
    if(tag==="SCRIPT"||tag==="STYLE")continue;
    var r=el.getBoundingClientRect();
    if(r.width===0||r.height===0)continue;
    var s=getComputedStyle(el);
    if(s.display==="none"||s.visibility==="hidden")continue;
    var bg=s.backgroundColor;
    if(bg&&bg!=="rgba(0, 0, 0, 0)"&&bg!=="transparent"){
      x.fillStyle=bg;x.fillRect(r.x,r.y,r.width,r.height);
    }
    var bc=s.borderColor,bw=parseFloat(s.borderWidth);
    if(bw>0&&bc&&bc!=="rgba(0, 0, 0, 0)"){
      x.strokeStyle=bc;x.lineWidth=bw;x.strokeRect(r.x,r.y,r.width,r.height);
    }
    if(tag==="IMG"&&el.complete&&el.naturalWidth>0){
      try{x.drawImage(el,r.x,r.y,r.width,r.height)}catch(e){}
    }
    if(tag==="CANVAS"){
      try{x.drawImage(el,r.x,r.y,r.width,r.height)}catch(e){}
    }
  }

  /* 2. Text nodes */
  var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(w.nextNode()){
    var tn=w.currentNode,t=tn.textContent;
    if(!t||!t.trim())continue;
    var p=tn.parentElement;
    if(!p||p.tagName==="SCRIPT"||p.tagName==="STYLE")continue;
    var ps=getComputedStyle(p);
    if(ps.display==="none"||ps.visibility==="hidden")continue;
    x.font=ps.fontStyle+" "+ps.fontWeight+" "+ps.fontSize+" "+ps.fontFamily;
    x.fillStyle=ps.color;x.textBaseline="top";
    var rng=document.createRange();
    rng.setStart(tn,0);rng.setEnd(tn,tn.length);
    var cr=rng.getClientRects();
    if(cr.length>0){
      x.fillText(t.trim(),cr[0].x,cr[0].y,cr[cr.length-1].right-cr[0].x);
    }
  }

  send(c.toDataURL("image/png"));
}`
