// PS1-style shader: vertex snapping, affine texture warp, per-vertex lighting, dithered fog.
export const VERT = `
uniform vec2 uSnap; uniform float uSnapOn;
uniform vec3 uAmbient; uniform vec3 uSunDir; uniform vec3 uSunCol;
uniform vec3 uLPos[5]; uniform vec3 uLCol[5];
uniform vec2 uFog; uniform vec3 uTint; uniform float uEmis; uniform float uAffine; uniform vec2 uUvOff;
uniform float uShadeOn; uniform vec3 uShade;   // optional vertical shade: x = darkest factor, y = height where it starts, z = height where it is fully dark
varying vec3 vUv3; varying vec3 vCol; varying float vFog;
void main(){
  vec4 wp = modelMatrix * vec4(position,1.0);
  vec4 mv = viewMatrix * wp;
  vec4 p = projectionMatrix * mv;
  if(uSnapOn>0.5 && abs(p.w)>0.0001){ vec2 s = p.xy/p.w; s = floor(s*uSnap+0.5)/uSnap; p.xy = s*p.w; }
  gl_Position = p;
  vec3 n = normalize(mat3(modelMatrix)*normal);
  vec3 l = uAmbient + uSunCol*max(dot(n,uSunDir),0.0);
  for(int i=0;i<5;i++){
    vec3 d = uLPos[i]-wp.xyz; float dist = length(d);
    float att = max(1.0-dist/16.0,0.0); att *= att;
    float nd = max(dot(n,d/max(dist,0.001)),0.0)*0.8+0.2;
    l += uLCol[i]*att*nd;
  }
  float sk = uShadeOn > 0.5 ? mix(1.0, uShade.x, smoothstep(uShade.y, uShade.z, position.y)) : 1.0;
  vCol = uTint*mix(l, vec3(1.0), uEmis)*sk;
  float q = mix(1.0, p.w, uAffine);
  vUv3 = vec3((uv+uUvOff)*q, q);
  vFog = clamp((length(mv.xyz)-uFog.x)/(uFog.y-uFog.x),0.0,1.0);
}`;
export const FRAG = `
uniform sampler2D map; uniform vec3 uFogCol; uniform float uCut; uniform float uAdd;
varying vec3 vUv3; varying vec3 vCol; varying float vFog;
float bayer(vec2 p){
  int x = int(mod(p.x,4.0)); int y = int(mod(p.y,4.0));
  const float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
  return m[y*4+x]/16.0;
}
void main(){
  vec2 uv = vUv3.xy/vUv3.z;
  vec4 t = texture2D(map, uv);
  if(t.a < uCut) discard;
  vec3 c = t.rgb*vCol;
  c = uAdd>0.5 ? c*(1.0-vFog) : mix(c, uFogCol, vFog);
  c = clamp(c,0.0,1.0);
  c += (bayer(gl_FragCoord.xy)-0.5)/255.0;
  gl_FragColor = vec4(c, t.a);
}`;
