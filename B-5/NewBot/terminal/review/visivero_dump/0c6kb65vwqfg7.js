(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,167536,e=>{"use strict";var t,r,o=e.i(753674),n=e.i(212556),i=e.i(975705);let a=(0,i.createContext)({position:"bottom-right",swipeDirection:["down","right"]});var s=e.i(538405),l=e.i(766181);let c=(0,s.createStaticStyles)(({css:e,cssVar:t})=>({action:e`
    cursor: pointer;

    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;

    height: 28px;
    padding-inline: 12px;
    border: none;
    border-radius: ${t.borderRadiusSM};

    font-size: 12px;
    font-weight: 500;
    line-height: 1;

    transition:
      background 0.2s,
      color 0.2s;

    &:focus-visible {
      outline: 2px solid ${t.colorPrimaryBorder};
      outline-offset: 1px;
    }
  `,actionDanger:e`
    color: ${t.colorTextLightSolid};
    background: ${t.colorError};

    &:hover {
      background: ${t.colorErrorHover};
    }

    &:active {
      background: ${t.colorErrorActive};
    }

    &:focus-visible {
      outline-color: ${t.colorErrorBorder};
    }
  `,actionGhost:e`
    border: 1px solid ${t.colorBorder};
    color: ${t.colorText};
    background: transparent;

    &:hover {
      border-color: ${t.colorPrimary};
      color: ${t.colorPrimary};
    }

    &:active {
      border-color: ${t.colorPrimaryActive};
      color: ${t.colorPrimaryActive};
    }
  `,actionPrimary:e`
    color: ${t.colorTextLightSolid};
    background: ${t.colorPrimary};

    &:hover {
      background: ${t.colorPrimaryHover};
    }

    &:active {
      background: ${t.colorPrimaryActive};
    }
  `,actionSecondary:e`
    color: ${t.colorText};
    background: ${t.colorFillSecondary};

    &:hover {
      background: ${t.colorFillTertiary};
    }

    &:active {
      background: ${t.colorFill};
    }
  `,actionText:e`
    color: ${t.colorPrimary};
    background: transparent;

    &:hover {
      background: ${t.colorFillTertiary};
    }

    &:active {
      background: ${t.colorFillSecondary};
    }
  `,actions:e`
    display: flex;
    flex-grow: 1;
    flex-shrink: 0;
    gap: 8px;
    align-items: center;
    align-self: flex-end;
    justify-content: flex-end;

    margin-block-start: 8px;
  `,close:e`
    cursor: pointer;

    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;

    width: 20px;
    height: 20px;
    margin-inline-start: auto;
    padding: 0;
    border: none;
    border-radius: ${t.borderRadiusSM};

    color: ${t.colorTextTertiary};

    background: transparent;

    transition: all 0.2s;

    &:hover {
      color: ${t.colorText};
      background: ${t.colorFillSecondary};
    }
  `,content:e`
    overflow: hidden;
    transition: opacity 0.2s;

    &[data-behind] {
      pointer-events: none;
      opacity: 0;
    }

    &[data-expanded] {
      pointer-events: auto;
      opacity: 1;
    }
  `,contentArea:e`
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  `,description:e`
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: ${t.colorTextSecondary};
  `,icon:e`
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
  `,root:e`
    --toast-gap: 12px;
    --toast-peek: 12px;
    --toast-scale: calc(1 - var(--toast-index) * 0.05);
    --toast-shrink: calc(1 - var(--toast-scale));
    --toast-collapsed-height: var(--toast-frontmost-height, var(--toast-height));

    cursor: default;
    user-select: none;

    position: absolute;
    z-index: calc(1000 - var(--toast-index));
    inset-inline: 0;

    box-sizing: border-box;
    width: 100%;
    height: var(--toast-collapsed-height);
    padding-block: 12px;
    padding-inline: 16px;
    border-radius: ${t.borderRadiusLG};

    color: ${t.colorText};

    background: ${t.colorBgElevated};
    background-clip: padding-box;
    box-shadow:
      0 0 0 1px color-mix(in srgb, ${t.colorBgSolid} 3%, transparent),
      0 1px 1px -0.5px color-mix(in srgb, ${t.colorBgSolid} 3%, transparent),
      0 3px 3px -1.5px color-mix(in srgb, ${t.colorBgSolid} 3%, transparent),
      0 6px 6px -3px color-mix(in srgb, ${t.colorBgSolid} 3%, transparent),
      0 12px 12px -6px color-mix(in srgb, ${t.colorBgSolid} 3%, transparent),
      0 24px 24px -12px color-mix(in srgb, ${t.colorBgSolid} 3%, transparent);

    transition:
      transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.4s,
      height 0.15s;

    /* Fill gap between stacked toasts to prevent hover flicker */
    &::after {
      content: '';
      position: absolute;
      inset-inline: 0;
      height: calc(var(--toast-gap) + var(--toast-peek) + 8px);
    }

    &[data-limited] {
      opacity: 0;
    }

    &[data-swiping] {
      transition: none;
    }
  `,rootBottom:e`
    inset-block: auto 0;
    transform-origin: bottom center;
    transform: translateX(var(--toast-swipe-movement-x))
      translateY(
        calc(
          var(--toast-swipe-movement-y) - (var(--toast-index) * var(--toast-peek)) -
            (var(--toast-shrink) * var(--toast-collapsed-height))
        )
      )
      scale(var(--toast-scale));

    &::after {
      inset-block-start: 100%;
    }

    &[data-expanded] {
      transform: translateX(var(--toast-swipe-movement-x))
        translateY(
          calc(
            var(--toast-swipe-movement-y) + var(--toast-offset-y) * -1 + var(--toast-index) *
              var(--toast-gap) * -1
          )
        )
        scale(1);
      height: var(--toast-height);
    }

    &[data-starting-style],
    &[data-ending-style] {
      transform: translateY(150%);
      opacity: 0;
    }
  `,rootTop:e`
    inset-block: 0 auto;
    transform-origin: top center;
    transform: translateX(var(--toast-swipe-movement-x))
      translateY(
        calc(
          var(--toast-swipe-movement-y) + (var(--toast-index) * var(--toast-peek)) +
            (var(--toast-shrink) * var(--toast-collapsed-height))
        )
      )
      scale(var(--toast-scale));

    &::after {
      inset-block-end: 100%;
    }

    &[data-expanded] {
      transform: translateX(var(--toast-swipe-movement-x))
        translateY(
          calc(
            var(--toast-swipe-movement-y) + var(--toast-offset-y) + var(--toast-index) *
              var(--toast-gap)
          )
        )
        scale(1);
      height: var(--toast-height);
    }

    &[data-starting-style],
    &[data-ending-style] {
      transform: translateY(-150%);
      opacity: 0;
    }
  `,title:e`
    margin: 0;

    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    color: ${t.colorText};
  `,titleRow:e`
    display: flex;
    gap: 8px;
    align-items: center;
  `,toastBody:e`
    display: flex;
    gap: 12px;
    align-items: flex-start;
  `,viewport:e`
    position: fixed;
    z-index: 1100;

    width: 360px;
    max-width: calc(100vw - 32px);

    outline: 0;

    @media (width <= 480px) {
      width: calc(100vw - 32px);
    }
  `,viewportBottom:e`
    inset-block-end: 16px;
    inset-inline-start: 50%;
    transform: translateX(-50%);
  `,viewportBottomLeft:e`
    inset-block-end: 16px;
    inset-inline-start: 16px;
  `,viewportBottomRight:e`
    inset-block-end: 16px;
    inset-inline-end: 16px;
  `,viewportTop:e`
    inset-block-start: 16px;
    inset-inline-start: 50%;
    transform: translateX(-50%);
  `,viewportTopLeft:e`
    inset-block-start: 16px;
    inset-inline-start: 16px;
  `,viewportTopRight:e`
    inset-block-start: 16px;
    inset-inline-end: 16px;
  `})),u=(0,l.cva)(c.viewport,{defaultVariants:{position:"bottom-right"},variants:{position:{bottom:c.viewportBottom,"bottom-left":c.viewportBottomLeft,"bottom-right":c.viewportBottomRight,top:c.viewportTop,"top-left":c.viewportTopLeft,"top-right":c.viewportTopRight}}}),d=(0,l.cva)(c.root,{defaultVariants:{position:"bottom-right"},variants:{position:{bottom:c.rootBottom,"bottom-left":c.rootBottom,"bottom-right":c.rootBottom,top:c.rootTop,"top-left":c.rootTop,"top-right":c.rootTop}}}),p=(0,l.cva)(c.action,{defaultVariants:{variant:"primary"},variants:{variant:{danger:c.actionDanger,ghost:c.actionGhost,primary:c.actionPrimary,secondary:c.actionSecondary,text:c.actionText}}});var f=e.i(772615),m=e.i(268601),g=e.i(590508);let h=(0,g.default)("triangle-alert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]),v=(0,g.default)("circle-check-big",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]),x=(0,g.default)("info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);var y=e.i(894368);let b=(0,g.default)("x",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]),w=(0,g.default)("circle-x",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);e.s([],462171),e.i(462171),e.i(217321);var k=e.i(922422),S=e.i(485451);let M=0;function T(e){return M+=1,`${e}-${Math.random().toString(36).slice(2,6)}-${M}`}var E=e.i(859852),R=e.i(676209),$=e.i(59070);let P=i.createContext(void 0);function C(){let e=i.useContext(P);if(!e)throw Error((0,$.default)(73));return e}var j=R;function B(e,t){if("string"==typeof e)return{description:e};if("function"==typeof e){let r=e(t);return"string"==typeof r?{description:r}:r}return e}var D=e.i(171058),L=e.i(921462),O=e.i(934946);let A=i.createContext(void 0);var F=e.i(616027),j=R;let N=((t={}).frontmostHeight="--toast-frontmost-height",t),z=i.forwardRef(function(e,t){let{render:r,className:o,children:n,...a}=e,{toasts:s,pauseTimers:l,resumeTimers:c,setHovering:u,setFocused:d,viewportRef:p,windowFocusedRef:f,prevFocusElement:g,setPrevFocusElement:h,expanded:v,focused:x}=C(),y=i.useRef(!1),b=i.useRef(!1),w=s.length,S=s[0]?.height??0,M=i.useMemo(()=>s.some(e=>"ending"===e.transitionStatus),[s]);function T(e){p.current&&(y.current=!0,e.relatedTarget===p.current?s[0]?.ref?.current?.focus():g?.focus({preventScroll:!0}))}function E(){l(),u(!0),b.current=!1}function $(){if(y.current){y.current=!1;return}!x&&(0,j.matchesFocusVisible)((0,k.ownerDocument)(p.current).activeElement)&&(d(!0),l())}i.useEffect(()=>{if(!p.current)return;function e(e){0!==w&&"F6"===e.key&&e.target!==p.current&&(e.preventDefault(),h((0,R.activeElement)((0,k.ownerDocument)(p.current))),p.current?.focus({preventScroll:!0}),l(),d(!0))}let t=(0,D.ownerWindow)(p.current);return t.addEventListener("keydown",e),()=>{t.removeEventListener("keydown",e)}},[l,d,h,w,p]),i.useEffect(()=>{if(!p.current||!w)return;let e=(0,D.ownerWindow)(p.current);function t(t){t.target===e&&(f.current=!1,l())}function r(t){if(t.relatedTarget||t.target===e)return;let r=(0,R.getTarget)(t),o=(0,R.activeElement)((0,k.ownerDocument)(p.current));(0,R.contains)(p.current,r)&&(0,j.matchesFocusVisible)(o)||c(),setTimeout(()=>{f.current=!0})}return e.addEventListener("blur",t,!0),e.addEventListener("focus",r,!0),()=>{e.removeEventListener("blur",t,!0),e.removeEventListener("focus",r,!0)}},[l,c,p,f,d,w]),i.useEffect(()=>{let e=p.current;if(!e||0===w)return;let t=(0,k.ownerDocument)(e);function r(t){if("touch"!==t.pointerType)return;let r=(0,R.getTarget)(t);(0,R.contains)(e,r)||(c(),u(!1),d(!1))}return t.addEventListener("pointerdown",r,!0),()=>{t.removeEventListener("pointerdown",r,!0)}},[w,c,d,u,p]),i.useEffect(()=>{f.current&&!M&&b.current&&(c(),u(!1),b.current=!1)},[M,c,u,f]);let P=i.useMemo(()=>({expanded:v}),[v]),B=(0,F.useRenderElement)("div",e,{ref:[t,p],state:P,props:[{tabIndex:-1,role:"region","aria-live":"polite","aria-atomic":!1,"aria-relevant":"additions text","aria-label":"Notifications",onMouseEnter:E,onMouseMove:E,onMouseLeave:function(){s.some(e=>"ending"===e.transitionStatus)?b.current=!0:(c(),u(!1))},onFocus:$,onBlur:function(e){!x||(0,R.contains)(p.current,e.relatedTarget)||(d(!1),c())},onKeyDown:function(e){"Tab"===e.key&&e.shiftKey&&e.target===p.current&&(e.preventDefault(),g?.focus({preventScroll:!0}),c())},onClick:$},{style:{[N.frontmostHeight]:S?`${S}px`:void 0}},a,{children:(0,m.jsxs)(i.Fragment,{children:[w>0&&g&&(0,m.jsx)(O.FocusGuard,{onFocus:T}),n,w>0&&g&&(0,m.jsx)(O.FocusGuard,{onFocus:T})]})}]}),z=i.useMemo(()=>({viewportRef:p}),[p]),I=i.useMemo(()=>s.filter(e=>"high"===e.priority),[s]);return(0,m.jsxs)(A.Provider,{value:z,children:[w>0&&g&&(0,m.jsx)(O.FocusGuard,{onFocus:T}),B,!x&&I.length>0&&(0,m.jsx)("div",{style:L.visuallyHidden,children:I.map(e=>(0,m.jsxs)("div",{role:"alert","aria-atomic":!0,children:[(0,m.jsx)("div",{children:e.title}),(0,m.jsx)("div",{children:e.description})]},e.id))})]})});var I=e.i(811368),V=e.i(426212),Y=e.i(433150);let X=i.createContext(void 0);function H(){let e=i.useContext(X);if(!e)throw Error((0,$.default)(66));return e}var U=e.i(543674),G=e.i(105441);let K=((r={}).index="--toast-index",r.offsetY="--toast-offset-y",r.height="--toast-height",r.swipeMovementX="--toast-swipe-movement-x",r.swipeMovementY="--toast-swipe-movement-y",r),q={...U.transitionStatusMapping,swipeDirection:e=>e?{"data-swipe-direction":e}:null};function W(e,t,r){switch(e){case"up":return-r;case"down":return r;case"left":return-t;case"right":return t;default:return 0}}let _=i.forwardRef(function(e,t){let{toast:r,render:o,className:n,swipeDirection:a=["down","right"],...s}=e,l=r.positionerProps?.anchor!==void 0,c=[];l||(c=Array.isArray(a)?a:[a]);let u=c.length>0,{toasts:d,focused:p,close:f,remove:g,setToasts:h,pauseTimers:v,expanded:x,setHovering:y}=C(),[b,w]=i.useState(void 0),[M,T]=i.useState(!1),[E,$]=i.useState(!1),[P,j]=i.useState(!1),[B,D]=i.useState({x:0,y:0}),[L,O]=i.useState({x:0,y:0,scale:1}),[A,N]=i.useState(),[z,H]=i.useState(),[U,_]=i.useState(null),J=i.useRef(null),Q=i.useRef({x:0,y:0}),Z=i.useRef({x:0,y:0,scale:1}),ee=i.useRef(void 0),et=i.useRef(0),er=i.useRef(!1),eo=i.useRef({x:0,y:0}),en=i.useRef(!1),ei=i.useMemo(()=>d.indexOf(r),[r,d]),ea=i.useMemo(()=>d.filter(e=>"ending"!==e.transitionStatus).indexOf(r),[r,d]),es=i.useMemo(()=>d.slice(0,d.indexOf(r)).reduce((e,t)=>e+(t.height||0),0),[d,r]);(0,G.useOpenChangeComplete)({open:"ending"!==r.transitionStatus,ref:J,onComplete(){"ending"===r.transitionStatus&&g(r.id)}});let el=(0,S.useStableCallback)((e=!1)=>{let t=J.current;if(!t)return;let o=t.style.height;t.style.height="auto";let n=t.offsetHeight;function i(){h(e=>e.map(e=>e.id===r.id?{...e,ref:J,height:n,transitionStatus:void 0}:e))}t.style.height=o,e?I.flushSync(i):i()});(0,Y.useIsoLayoutEffect)(el,[el]),i.useEffect(()=>{if(!u)return;let e=J.current;if(e)return e.addEventListener("touchmove",t,{passive:!1}),()=>{e.removeEventListener("touchmove",t)};function t(t){(0,R.contains)(e,t.target)&&t.preventDefault()}},[u]);let ec="high"===r.priority,eu={role:ec?"alertdialog":"dialog",tabIndex:0,"aria-modal":!1,"aria-labelledby":A,"aria-describedby":z,"aria-hidden":!!ec&&!p||void 0,onPointerDown:u?function(e){if(0!==e.button)return;"touch"===e.pointerType&&v();let t=(0,R.getTarget)(e.nativeEvent);if(!(t&&t.closest('button,a,input,textarea,[role="button"],[data-swipe-ignore]'))){if(er.current=!1,ee.current=void 0,et.current=0,Q.current={x:e.clientX,y:e.clientY},eo.current=Q.current,J.current){let e=function(e){let t=window.getComputedStyle(e).transform,r=0,o=0,n=1;if(t&&"none"!==t){let e=t.match(/matrix(?:3d)?\(([^)]+)\)/);if(e){let t=e[1].split(", ").map(parseFloat);6===t.length?(r=t[4],o=t[5],n=Math.sqrt(t[0]*t[0]+t[1]*t[1])):16===t.length&&(r=t[12],o=t[13],n=t[0])}}return{x:r,y:o,scale:n}}(J.current);Z.current=e,O(e),D({x:e.x,y:e.y})}y(!0),T(!0),$(!1),_(null),en.current=!0,J.current?.setPointerCapture(e.pointerId)}}:void 0,onPointerMove:u?function(e){let t,r,o;if(!M)return;e.preventDefault(),en.current&&(Q.current={x:e.clientX,y:e.clientY},en.current=!1);let{clientY:n,clientX:i,movementX:a,movementY:s}=e;(s<0&&n>eo.current.y||s>0&&n<eo.current.y)&&(eo.current={x:eo.current.x,y:n}),(a<0&&i>eo.current.x||a>0&&i<eo.current.x)&&(eo.current={x:i,y:eo.current.y});let l=i-Q.current.x,u=n-Q.current.y,d=n-eo.current.y,p=i-eo.current.x;if(!E&&Math.sqrt(l*l+u*u)>=1&&($(!0),null===U)){let e=c.includes("left")||c.includes("right"),t=c.includes("up")||c.includes("down");e&&t&&_(Math.abs(l)>Math.abs(u)?"horizontal":"vertical")}if(ee.current){let e=ee.current,t=W(e,p,d);t>40?(er.current=!1,w(e)):c.includes("left")&&c.includes("right")||c.includes("up")&&c.includes("down")||!(et.current-t>=10)||(er.current=!0)}else"vertical"===U?u>0?t="down":u<0&&(t="up"):"horizontal"===U?l>0?t="right":l<0&&(t="left"):t=Math.abs(l)>=Math.abs(u)?l>0?"right":"left":u>0?"down":"up",t&&c.includes(t)&&(ee.current=t,et.current=W(t,l,u),w(t));let f=(r=l,o=u,c.includes("left")||c.includes("right")?(!c.includes("right")&&l>0&&(r=l**.5),!c.includes("left")&&l<0&&(r=-(Math.abs(l)**.5))):r=l>0?l**.5:-(Math.abs(l)**.5),c.includes("up")||c.includes("down")?(!c.includes("down")&&u>0&&(o=u**.5),!c.includes("up")&&u<0&&(o=-(Math.abs(u)**.5))):o=u>0?u**.5:-(Math.abs(u)**.5),{x:r,y:o}),m=Z.current.x,g=Z.current.y;"horizontal"===U?(c.includes("left")||c.includes("right"))&&(m+=f.x):("vertical"===U||(c.includes("left")||c.includes("right"))&&(m+=f.x),(c.includes("up")||c.includes("down"))&&(g+=f.y)),D({x:m,y:g})}:void 0,onPointerUp:u?function(e){let t;if(!M)return;if(T(!1),$(!1),_(null),J.current?.releasePointerCapture(e.pointerId),er.current){D({x:L.x,y:L.y}),w(void 0);return}let o=!1,n=B.x-L.x,i=B.y-L.y;for(let e of c){switch(e){case"right":n>40&&(o=!0,t="right");break;case"left":n<-40&&(o=!0,t="left");break;case"down":i>40&&(o=!0,t="down");break;case"up":i<-40&&(o=!0,t="up")}if(o)break}o?(w(t),j(!0),f(r.id)):(D({x:L.x,y:L.y}),w(void 0))}:void 0,onKeyDown:function(e){"Escape"===e.key&&J.current&&(0,R.contains)(J.current,(0,R.activeElement)((0,k.ownerDocument)(J.current)))&&f(r.id)},inert:(0,V.inertValue)(r.limited),style:{...function(){if(!M&&B.x===L.x&&B.y===L.y&&!P)return{[K.swipeMovementX]:"0px",[K.swipeMovementY]:"0px"};let e=B.x-L.x,t=B.y-L.y;return{transition:M?"none":void 0,transform:M?`translateX(${B.x}px) translateY(${B.y}px) scale(${L.scale})`:void 0,[K.swipeMovementX]:`${e}px`,[K.swipeMovementY]:`${t}px`}}(),[K.index]:"ending"===r.transitionStatus?ei:ea,[K.offsetY]:`${es}px`,[K.height]:r.height?`${r.height}px`:void 0}},ed=i.useMemo(()=>({rootRef:J,toast:r,titleId:A,setTitleId:N,descriptionId:z,setDescriptionId:H,swiping:M,swipeDirection:b,recalculateHeight:el,index:ei,visibleIndex:ea,expanded:x}),[r,A,z,M,b,el,ei,ea,x]),ep=i.useMemo(()=>({transitionStatus:r.transitionStatus,expanded:x,limited:r.limited||!1,type:r.type,swiping:ed.swiping,swipeDirection:ed.swipeDirection}),[x,r.transitionStatus,r.limited,r.type,ed.swiping,ed.swipeDirection]),ef=(0,F.useRenderElement)("div",e,{ref:[t,ed.rootRef],state:ep,stateAttributesMapping:q,props:[eu,s]});return(0,m.jsx)(X.Provider,{value:ed,children:ef})}),J=i.forwardRef(function(e,t){let{render:r,className:o,...n}=e,{visibleIndex:a,expanded:s,recalculateHeight:l}=H(),c=i.useRef(null);(0,Y.useIsoLayoutEffect)(()=>{let e=c.current;if(!e||(l(),"function"!=typeof ResizeObserver||"function"!=typeof MutationObserver))return;let t=new ResizeObserver(()=>l(!0)),r=new MutationObserver(()=>l(!0));return t.observe(e),r.observe(e,{childList:!0,subtree:!0,characterData:!0}),()=>{t.disconnect(),r.disconnect()}},[l]);let u=a>0,d=i.useMemo(()=>({expanded:s,behind:u}),[s,u]);return(0,F.useRenderElement)("div",e,{ref:[t,c],state:d,props:n})});var Q=e.i(439838);let Z=i.forwardRef(function(e,t){let{render:r,className:o,id:n,children:a,...s}=e,{toast:l}=H(),c=a??l.description,u=!!c,d=(0,Q.useId)(n),{setDescriptionId:p}=H();(0,Y.useIsoLayoutEffect)(()=>{if(u)return p(d),()=>{p(void 0)}},[u,d,p]);let f=i.useMemo(()=>({type:l.type}),[l.type]),m=(0,F.useRenderElement)("p",e,{ref:t,state:f,props:{...s,id:d,children:c}});return u?m:null}),ee=i.forwardRef(function(e,t){let{render:r,className:o,id:n,children:a,...s}=e,{toast:l}=H(),c=a??l.title,u=!!c,d=(0,Q.useId)(n),{setTitleId:p}=H();(0,Y.useIsoLayoutEffect)(()=>{if(u)return p(d),()=>{p(void 0)}},[u,d,p]);let f=i.useMemo(()=>({type:l.type}),[l.type]),m=(0,F.useRenderElement)("h2",e,{ref:t,state:f,props:{...s,id:d,children:c}});return u?m:null});var et=e.i(906987);let er=i.forwardRef(function(e,t){let{render:r,className:o,disabled:n,nativeButton:a=!0,...s}=e,{close:l,expanded:c}=C(),{toast:u}=H(),[d,p]=i.useState(!1),{getButtonProps:f,buttonRef:m}=(0,et.useButton)({disabled:n,native:a}),g=i.useMemo(()=>({type:u.type}),[u.type]);return(0,F.useRenderElement)("button",e,{ref:[t,m],state:g,props:[{"aria-hidden":!c&&!d,onClick(){l(u.id)},onFocus(){p(!0)},onBlur(){p(!1)}},s,f]})}),eo=i.forwardRef(function(e,t){let{render:r,className:o,disabled:n,nativeButton:a=!0,...s}=e,{toast:l}=H(),c=l.actionProps?.children??s.children,u=!!c,{getButtonProps:d,buttonRef:p}=(0,et.useButton)({disabled:n,native:a}),f=i.useMemo(()=>({type:l.type}),[l.type]),m=(0,F.useRenderElement)("button",e,{ref:[t,p],state:f,props:[s,l.actionProps,d,{children:c}]});return u?m:null}),en=e.i(106867).FloatingPortalLite;var ei=e.i(420819),ea=e.i(673477),es=e.i(75683),el=e.i(844284),ec=e.i(784757);let eu=i.createContext(void 0);var ed=e.i(607787);let ep=i.forwardRef(function(e,t){let{toast:r,...o}=e,{toasts:n}=C(),a=r.positionerProps??el.EMPTY_OBJECT,{render:s,className:l,anchor:c=a.anchor,positionMethod:u=a.positionMethod??"absolute",side:d=a.side??"top",align:p=a.align??"center",sideOffset:f=a.sideOffset??0,alignOffset:g=a.alignOffset??0,collisionBoundary:h=a.collisionBoundary??"clipping-ancestors",collisionPadding:v=a.collisionPadding??5,arrowPadding:x=a.arrowPadding??5,sticky:y=a.sticky??!1,disableAnchorTracking:b=a.disableAnchorTracking??!1,collisionAvoidance:w=a.collisionAvoidance??ec.POPUP_COLLISION_AVOIDANCE,...k}=o,[S,M]=i.useState(null),T=i.useMemo(()=>n.indexOf(r),[r,n]),E=i.useMemo(()=>n.filter(e=>"ending"!==e.transitionStatus).indexOf(r),[r,n]),R=(0,ei.isElement)(c)?c:null,$=(0,ed.useFloatingRootContext)({open:!0,onOpenChange:el.NOOP,elements:{floating:S,reference:R}}),P=(0,ea.useAnchorPositioning)({anchor:R,positionMethod:u,floatingRootContext:$,mounted:!0,side:d,sideOffset:f,align:p,alignOffset:g,collisionBoundary:h,collisionPadding:v,sticky:y,arrowPadding:x,disableAnchorTracking:b,keepMounted:!0,collisionAvoidance:w}),j=i.useMemo(()=>({role:"presentation",style:{...P.positionerStyles,...{},[K.index]:"ending"===r.transitionStatus?T:E}}),[P.positionerStyles,r.transitionStatus,T,E]),B=i.useMemo(()=>({side:P.side,align:P.align,anchorHidden:P.anchorHidden}),[P.side,P.align,P.anchorHidden]),D=i.useMemo(()=>({...B,arrowRef:P.arrowRef,arrowStyles:P.arrowStyles,arrowUncentered:P.arrowUncentered}),[B,P.arrowRef,P.arrowStyles,P.arrowUncentered]),L=(0,F.useRenderElement)("div",e,{state:B,props:[j,k],ref:[t,M],stateAttributesMapping:es.popupStateMapping});return(0,m.jsx)(eu.Provider,{value:D,children:L})}),ef=i.forwardRef(function(e,t){let{className:r,render:o,...n}=e,{arrowRef:a,side:s,align:l,arrowUncentered:c,arrowStyles:u}=function(){let e=i.useContext(eu);if(void 0===e)throw Error((0,$.default)(84));return e}(),d=i.useMemo(()=>({side:s,align:l,uncentered:c}),[s,l,c]);return(0,F.useRenderElement)("div",e,{state:d,ref:[t,a],props:[{style:u,"aria-hidden":!0},n]})});e.s(["Action",0,eo,"Arrow",0,ef,"Close",0,er,"Content",0,J,"Description",0,Z,"Portal",0,en,"Positioner",0,ep,"Provider",0,function(e){let{children:t,timeout:r=5e3,limit:o=3,toastManager:n}=e,[a,s]=i.useState([]),[l,c]=i.useState(!1),[u,d]=i.useState(!1),[p,f]=i.useState(null);0===a.length&&(l&&c(!1),u&&d(!1));let g=l||u,h=i.useRef(new Map),v=i.useRef(null),x=i.useRef(!0),y=i.useRef(!1),b=(0,S.useStableCallback)(()=>{y.current||(y.current=!0,h.current.forEach(e=>{if(e.timeout){e.timeout.clear();let t=Date.now()-e.start,r=e.delay-t;e.remaining=r>0?r:0}}))}),w=(0,S.useStableCallback)(()=>{y.current&&(y.current=!1,h.current.forEach((e,t)=>{e.remaining=e.remaining>0?e.remaining:e.delay,e.timeout??=E.Timeout.create(),e.timeout.start(e.remaining,()=>{h.current.delete(t),e.callback()}),e.start=Date.now()}))}),M=(0,S.useStableCallback)(e=>{s(t=>{let r=t.map(t=>t.id===e?{...t,transitionStatus:"ending",height:0}:t),n=r.filter(e=>"ending"!==e.transitionStatus);return r.map(e=>{if("ending"===e.transitionStatus)return e;let t=n.indexOf(e)>=o;return{...e,limited:t}})});let t=h.current.get(e);t&&t.timeout&&(t.timeout.clear(),h.current.delete(e));let r=a.find(t=>t.id===e);r?.onClose?.(),function(e){let t=(0,R.activeElement)((0,k.ownerDocument)(v.current));if(!v.current||!(0,R.contains)(v.current,t)||!(0,j.matchesFocusVisible)(t))return;let r=a.findIndex(t=>t.id===e),o=null,n=r+1;for(;n<a.length;){if("ending"!==a[n].transitionStatus){o=a[n];break}n+=1}if(!o)for(n=r-1;n>=0;){if("ending"!==a[n].transitionStatus){o=a[n];break}n-=1}o?o.ref?.current?.focus():p?.focus({preventScroll:!0})}(e),1===a.length&&(c(!1),d(!1))}),$=(0,S.useStableCallback)(e=>{s(t=>t.filter(t=>t.id!==e));let t=a.find(t=>t.id===e);t?.onRemove?.()}),C=(0,S.useStableCallback)((e,t,r)=>{let o=Date.now(),n=x.current&&!l&&!u,i=n?E.Timeout.create():void 0;i?.start(t,()=>{h.current.delete(e),r()}),h.current.set(e,{timeout:i,start:n?o:0,delay:t,remaining:t,callback:r})}),D=(0,S.useStableCallback)(e=>{let t=e.id||T("toast"),n={...e,id:t,transitionStatus:"starting"};s(e=>{let t=[n,...e],r=t.filter(e=>"ending"!==e.transitionStatus);if(r.length>o){let e=r.length-o,n=r.slice(-e);return t.map(e=>n.some(t=>t.id===e.id)?{...e,limited:!0}:{...e,limited:!1})}return t.map(e=>({...e,limited:!1}))});let i=n.timeout??r;return"loading"!==n.type&&i>0&&C(t,i,()=>M(t)),(l||u||!x.current)&&b(),t}),L=(0,S.useStableCallback)((e,t)=>{s(r=>r.map(r=>r.id===e?{...r,...t}:r))}),O=(0,S.useStableCallback)((e,t)=>{let o=D({...B(t.loading),type:"loading"}),n=e.then(e=>{let n=B(t.success,e);L(o,{...n,type:"success"});let i=n.timeout??r;return i>0&&C(o,i,()=>M(o)),(l||u||!x.current)&&b(),e}).catch(e=>{let n=B(t.error,e);L(o,{...n,type:"error"});let i=n.timeout??r;return i>0&&C(o,i,()=>M(o)),(l||u||!x.current)&&b(),Promise.reject(e)});return({}).hasOwnProperty.call(t,"setPromise")&&t.setPromise(n),n});i.useEffect(function(){if(n)return n[" subscribe"](({action:e,options:t})=>{let r=t.id;"promise"===e&&t.promise?O(t.promise,t):"update"===e&&r?L(r,t):"close"===e&&r?M(r):D(t)})},[D,L,C,r,n,O,M]);let A=i.useMemo(()=>({toasts:a,setToasts:s,hovering:l,setHovering:c,focused:u,setFocused:d,expanded:g,add:D,close:M,remove:$,update:L,promise:O,pauseTimers:b,resumeTimers:w,prevFocusElement:p,setPrevFocusElement:f,viewportRef:v,scheduleTimer:C,windowFocusedRef:x}),[D,M,u,l,g,b,p,O,$,w,C,a,L]);return(0,m.jsx)(P.Provider,{value:A,children:t})},"Root",0,_,"Title",0,ee,"Viewport",0,z,"createToastManager",0,function(){let e=[];function t(t){e.forEach(e=>e(t))}return{" subscribe":function(t){return e.push(t),()=>{let r=e.indexOf(t);-1!==r&&e.splice(r,1)}},add(e){let r=e.id||T("toast");return t({action:"add",options:{...e,id:r,transitionStatus:"starting"}}),r},close(e){t({action:"close",options:{id:e}})},update(e,r){t({action:"update",options:{...r,id:e}})},promise(e,r){let o=e;return t({action:"promise",options:{...r,promise:e,setPromise(e){o=e}}}),o}}},"useToastManager",0,function(){let e=i.useContext(P);if(!e)throw Error((0,$.default)(73));let{toasts:t,add:r,close:o,update:n,promise:a}=e;return i.useMemo(()=>({toasts:t,add:r,close:o,update:n,promise:a}),[t,r,o,n,a])}],19979);var em=e.i(19979),em=em;let eg={default:x,error:w,info:x,loading:y.Loader2,success:v,warning:h},eh={default:s.cssVar.colorText,error:s.cssVar.colorError,info:s.cssVar.colorInfo,loading:s.cssVar.colorPrimary,success:s.cssVar.colorSuccess,warning:s.cssVar.colorWarning},ev=(0,i.memo)(({toast:e,classNames:t,styles:r})=>{let{position:o,swipeDirection:n}=(0,i.useContext)(a),l=e.data,u=l?.type??"default",g=l?.closable??!0,h=l?.hideCloseButton??!1,v=l?.icon,x=e.title??l?.title,y=e.description??l?.description,w=e.actionProps??l?.actionProps,k=l?.actions,S=eh[u],M=v??eg[u];return(0,m.jsx)(em.Root,{className:(0,s.cx)(d({position:o}),t?.root),swipeDirection:n,toast:e,style:{...r?.root,...l?.style},children:(0,m.jsx)(em.Content,{className:(0,s.cx)(c.content,t?.content),style:r?.content,children:(0,m.jsxs)("div",{className:c.toastBody,children:[M?(0,m.jsx)("div",{className:(0,s.cx)(c.icon,t?.icon),style:r?.icon,children:(0,m.jsx)(f.default,{color:S,icon:M,size:18,spin:"loading"===u})}):null,(0,m.jsxs)("div",{className:c.contentArea,children:[(0,m.jsxs)("div",{className:c.titleRow,children:[x&&(0,m.jsx)(em.Title,{className:(0,s.cx)(c.title,t?.title),style:r?.title,children:x}),g&&!h&&(0,m.jsx)(em.Close,{"aria-label":"Close",className:(0,s.cx)(c.close,t?.close),style:r?.close,children:(0,m.jsx)(b,{size:14})})]}),y&&(0,m.jsx)(em.Description,{className:(0,s.cx)(c.description,t?.description),style:{marginBlockStart:4*!!x,...r?.description},children:y}),k&&k.length>0?(0,m.jsx)("div",{className:(0,s.cx)(c.actions,t?.actions),style:r?.actions,children:k.map((e,o)=>(0,m.jsx)(em.Action,{style:r?.action,className:(0,s.cx)(p({variant:e.variant??"primary"}),t?.action),onClick:e.onClick,...e.props,children:e.label},o))}):w?(0,m.jsx)(em.Action,{className:(0,s.cx)(p({variant:"primary"}),t?.action),style:r?.action,...w}):null]})]})})})});ev.displayName="ToastItem";var em=em;let ex=["top","top-left","top-right","bottom","bottom-left","bottom-right"],ey={duration:5e3,limit:5,position:"bottom-right",swipeDirection:["down","right"]},eb={bottom:em.createToastManager(),"bottom-left":em.createToastManager(),"bottom-right":em.createToastManager(),top:em.createToastManager(),"top-left":em.createToastManager(),"top-right":em.createToastManager()},ew={bottom:new Set,"bottom-left":new Set,"bottom-right":new Set,top:new Set,"top-left":new Set,"top-right":new Set},ek=e=>eb[e],eS=(e,t)=>"string"==typeof e?{description:e,type:t}:{...e,type:t},eM=e=>{let t=e.placement??ey.position,r=ek(t),o=e.onRemove,n=r.add({data:e,description:e.description,onClose:e.onClose,onRemove:()=>{ew[t].delete(n),o?.()},timeout:e.duration??ey.duration,title:e.title});return ew[t].add(n),{close:()=>ek(t).close(n),id:n,update:e=>{ek(t).update(n,{data:e,description:e.description,title:e.title})}}},eT=Object.assign(e=>eM({type:"default",...e}),{dismiss:e=>{if(e)for(let[t,r]of Object.entries(eb))ew[t].delete(e),r.close(e);else for(let[e,t]of Object.entries(eb)){for(let r of Array.from(ew[e]))t.close(r);ew[e].clear()}},error:e=>eM(eS(e,"error")),info:e=>eM(eS(e,"info")),loading:e=>eM({duration:0,...eS(e,"loading")}),promise:async function e(e,t){let r=eM({closable:!1,duration:0,type:"loading",..."string"==typeof t.loading?{description:t.loading}:t.loading});try{let o=await e;return r.close(),eM({type:"success",..."string"==typeof t.success?{description:t.success}:"function"==typeof t.success?{description:t.success(o)}:t.success}),o}catch(e){throw r.close(),eM({type:"error",..."string"==typeof t.error?{description:t.error}:"function"==typeof t.error?{description:t.error(e)}:t.error}),e}},success:e=>eM(eS(e,"success")),warning:e=>eM(eS(e,"warning"))}),eE=(0,i.memo)(()=>{let{toasts:e}=em.useToastManager();return e.map(e=>(0,m.jsx)(ev,{toast:e},e.id))});eE.displayName="ToastList";let eR=(0,i.memo)(({root:e,className:t,duration:r=5e3,limit:l=5,position:c="bottom-right",swipeDirection:d=["down","right"]})=>{let p=(0,o.useIsClient)(),f=(0,n.useAppElement)();if((0,i.useEffect)(()=>{ey={duration:r,limit:l,position:c,swipeDirection:d}},[r,l,c,d]),!p)return null;let g=e??f??document.body;ex.map(e=>(0,m.jsx)(a,{value:{position:e,swipeDirection:d},children:(0,m.jsx)(em.Provider,{limit:l,timeout:r,toastManager:ek(e),children:(0,m.jsx)(em.Portal,{container:g,children:(0,m.jsx)(em.Viewport,{className:(0,s.cx)(u({position:e}),t),children:(0,m.jsx)(eE,{})})})})},e))});eR.displayName="ToastHost",e.s(["ToastHost",0,eR,"toast",0,eT],167536)}]);