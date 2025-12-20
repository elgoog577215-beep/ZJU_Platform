import{a as r,j as e}from"./react-vendor-CXoD4tGQ.js";import{z as k,a4 as N,ai as S,Q as D,t as M,aj as P,y as T,x as z,a8 as x}from"./three-vendor-CkDWRuyZ.js";import{X as E}from"./ui-vendor-ChojsKpE.js";const R=T({uTexture:null,uTime:0,uDepthStrength:0,uZoom:1},`
    varying vec2 vUv;
    uniform float uDepthStrength;
    uniform sampler2D uTexture;

    float getBrightness(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }

    void main() {
      vUv = uv;
      
      // Sample brightness for depth estimation
      vec4 color = texture2D(uTexture, uv);
      float brightness = getBrightness(color.rgb);
      
      vec3 pos = position;
      
      // Push bright pixels back (sky), pull dark pixels forward (foreground)
      // This is a common heuristic for single-image depth
      // Inverted: Dark is near (1.0), Bright is far (0.0)
      float depth = 1.0 - brightness;
      
      // Apply displacement along view direction (Z)
      pos.z += depth * uDepthStrength;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,`
    uniform sampler2D uTexture;
    uniform float uZoom;
    varying vec2 vUv;

    void main() {
      // Simple zoom from center
      vec2 uv = (vUv - 0.5) / uZoom + 0.5;
      
      // Edge clamping (avoid texture repeat artifacts during zoom)
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        discard; // Or create a border
      }

      vec4 color = texture2D(uTexture, uv);
      gl_FragColor = color;
    }
  `);z({LivePhotoMaterial:R});const L=({url:a,isPressed:m})=>{const t=r.useRef(),s=r.useRef();r.useRef();const[o,u]=r.useState(null),[h,v]=r.useState(!1);r.useEffect(()=>{const d=new S;d.setCrossOrigin("anonymous"),d.load(a,l=>u(l),void 0,l=>{console.error("Failed to load texture",l),v(!0)})},[a]);const n=r.useRef(0),i=r.useRef(new D(Math.random()*100,Math.random()*100,Math.random()*100));if(M((d,l)=>{const j=m?1:0;n.current=x.lerp(n.current,j,l*5),t.current&&(t.current.uDepthStrength=x.lerp(0,1.5,n.current),t.current.uZoom=x.lerp(1,1.05,n.current));const c=d.clock.getElapsedTime(),p=n.current*.2,y=Math.sin(c*1.5+i.current.x)*.5+Math.sin(c*3.5+i.current.x)*.25,w=Math.cos(c*1.3+i.current.y)*.5+Math.cos(c*3.2+i.current.y)*.25;Math.sin(c*.8+i.current.z)*.5,s.current&&(s.current.rotation.x=w*.05*p,s.current.rotation.y=y*.05*p)}),h)return e.jsx(P,{center:!0,children:e.jsx("div",{className:"text-red-500 font-mono bg-black/80 p-2 rounded border border-red-500/50",children:"Failed to load 3D view"})});if(!o)return null;const g=o.image?o.image.width/o.image.height:1.77,f=10,b=f*g;return e.jsxs("mesh",{ref:s,children:[e.jsx("planeGeometry",{args:[b,f,64,64]}),e.jsx("livePhotoMaterial",{ref:t,uTexture:o,transparent:!0})]})},Z=({photo:a,onClose:m})=>{const[t,s]=r.useState(!1),[o,u]=r.useState(!0);return e.jsxs("div",{className:"fixed inset-0 z-[100] bg-black select-none cursor-pointer",onPointerDown:()=>{s(!0),u(!1)},onPointerUp:()=>s(!1),onPointerLeave:()=>s(!1),onTouchStart:()=>{s(!0),u(!1)},onTouchEnd:()=>s(!1),children:[e.jsxs("div",{className:`absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20 transition-opacity duration-300 ${t?"opacity-0":"opacity-100"}`,children:[e.jsxs("div",{className:"pointer-events-none",children:[e.jsx("h2",{className:"text-white font-medium text-lg drop-shadow-md",children:a.title}),e.jsx("p",{className:"text-white/60 text-xs",children:a.date||"Just now"})]}),e.jsx("button",{onClick:h=>{h.stopPropagation(),m()},className:"pointer-events-auto bg-black/20 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md transition-all",children:e.jsx(E,{size:24})})]}),e.jsx("div",{className:"absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none",children:e.jsxs("div",{className:`
          flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md transition-all duration-300
          ${t?"bg-yellow-500/20 text-yellow-400":"bg-gray-800/40 text-gray-400"}
        `,children:[e.jsx("div",{className:`
            w-3 h-3 rounded-full border-2 flex items-center justify-center
            ${t?"border-yellow-400":"border-gray-400 strike-diagonal"}
          `,children:e.jsx("div",{className:`w-1.5 h-1.5 rounded-full ${t?"bg-yellow-400 animate-pulse":"hidden"}`})}),e.jsx("span",{className:"text-xs font-bold tracking-wider",children:"LIVE"})]})}),e.jsx("div",{className:`
        absolute bottom-12 left-1/2 -translate-x-1/2 text-white/80 font-medium text-sm tracking-wide pointer-events-none
        transition-all duration-500 transform
        ${o&&!t?"opacity-100 translate-y-0":"opacity-0 translate-y-4"}
      `,children:"PRESS AND HOLD"}),e.jsxs("div",{className:"w-full h-full flex items-center justify-center relative",children:[e.jsxs(k,{dpr:[1,2],children:[" ",e.jsxs(r.Suspense,{fallback:null,children:[e.jsx(N,{makeDefault:!0,position:[0,0,10],fov:50}),e.jsx("color",{attach:"background",args:["#000"]}),e.jsx(L,{url:a.url,isPressed:t})]})]}),e.jsx("div",{className:"absolute inset-0 flex items-center justify-center pointer-events-none"})]})]})};export{Z as L};
