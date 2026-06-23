// SlicedLabs · studio · © 2026 SlicedLabs — shared WebGL2 init for the living field.
// Used by BOTH the OffscreenCanvas worker AND the main-thread fallback, so there's one
// implementation. Returns draw()/resize(); the caller owns the loop + state.
export function initGL(canvas: HTMLCanvasElement | OffscreenCanvas) {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: true,
    premultipliedAlpha: false,
    powerPreference: "low-power",
  }) as WebGL2RenderingContext | null;
  if (!gl) return null;

  const VERT = `#version 300 es
  void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.0-1.0,0,1); }`;

  const FRAG = `#version 300 es
  precision highp float;
  out vec4 o;
  uniform vec2 u_res;
  uniform float u_time;
  uniform float u_warm;   // 0 = dark/cinematic, 1 = warm/latte
  uniform float u_vel;    // 0..1 SMOOTHED scroll velocity (gentle liquid on the move)
  const vec3 CORAL=vec3(0.851,0.345,0.235);
  const vec3 ORANGE=vec3(0.796,0.408,0.125);
  const vec3 TEAL=vec3(0.184,0.608,0.502);
  const vec3 BLUE=vec3(0.188,0.545,0.859);
  const vec3 MARK=vec3(0.298,0.714,1.0);
  const vec3 L_TAN=vec3(0.80,0.55,0.32);    // warm caramel (latte lows)
  const vec3 L_MILK=vec3(0.91,0.78,0.61);   // warm steamed milk
  const vec3 L_FOAM=vec3(0.98,0.95,0.87);   // warm foam
  const vec3 TANGERINE=vec3(0.96,0.52,0.18);// tangerine swirl accent
  float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
  float fbm(vec2 p){ float v=0.0,a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
    for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=0.5; } return v; }
  vec3 ramp(float t){ t=clamp(t,0.0,1.0);
    if(t<0.25) return mix(CORAL,ORANGE,t/0.25);
    if(t<0.5)  return mix(ORANGE,TEAL,(t-0.25)/0.25);
    if(t<0.75) return mix(TEAL,BLUE,(t-0.5)/0.25);
    return mix(BLUE,MARK,(t-0.75)/0.25); }
  vec3 latteRamp(float t){ t=clamp(t,0.0,1.0);
    if(t<0.5) return mix(L_TAN,L_MILK,t/0.5);
    return mix(L_MILK,L_FOAM,(t-0.5)/0.5); }
  void main(){
    vec2 uv=(gl_FragCoord.xy-0.5*u_res)/min(u_res.x,u_res.y);
    float t=u_time*0.042;
    vec2 q=vec2(fbm(uv*1.4+vec2(0.0,t)), fbm(uv*1.4+vec2(5.2,-t)));
    vec2 r=vec2(fbm(uv*1.4+3.0*q+vec2(1.7,9.2)+t*0.7), fbm(uv*1.4+3.0*q+vec2(8.3,2.8)-t*0.7));
    // gentle scroll-liquid — small, SMOOTHED influence so fast scrolls don't jump
    float f=fbm(uv*1.2+2.2*r*(1.0+u_vel*0.22));
    vec3 col=ramp(f*0.85+0.18*r.x+0.1);
    col*=0.85+0.5*smoothstep(0.2,0.9,f);
    // warm → a VISIBLE, warm Italian-latte swirl (caramel → milk → foam), marbled with a
    // little tangerine, plus a hint of brand.
    vec3 latte=latteRamp(f*0.9+0.12*r.y+0.05);
    float tang=smoothstep(0.5,0.92, fbm(uv*1.7-1.5*q+4.0));
    latte=mix(latte, TANGERINE, tang*0.20);
    latte=mix(latte, col, 0.12);
    col=mix(col, latte, u_warm);
    float vig=smoothstep(1.3,0.2,length(uv));
    col*=mix(0.55,1.0,vig);
    col+=(hash(gl_FragCoord.xy+u_time)-0.5)*0.022;
    float a=mix(0.80, 0.72, u_warm);
    o=vec4(col, a);
  }`;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const uRes = gl.getUniformLocation(prog, "u_res");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uWarm = gl.getUniformLocation(prog, "u_warm");
  const uVel = gl.getUniformLocation(prog, "u_vel");

  return {
    resize(w: number, h: number) {
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    },
    draw(timeSec: number, warm: number, vel: number) {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, timeSec);
      gl.uniform1f(uWarm, warm);
      gl.uniform1f(uVel, vel);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
