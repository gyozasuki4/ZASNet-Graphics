export const vertexShader=`#version 300 es
in vec2 a_position; in float a_value; in float a_state; uniform mat4 u_matrix; out float v_value; flat out float v_state; void main(){gl_Position=u_matrix*vec4(a_position,0.0,1.0);v_value=a_value;v_state=a_state;}`;
export const fragmentShader=`#version 300 es
precision highp float; in float v_value; flat in float v_state; uniform sampler2D u_palette; uniform float u_opacity; uniform float u_mode; uniform float u_debug_magenta; out vec4 outColor; void main(){if(v_state>0.5){outColor=vec4(0.0);return;}if(u_debug_magenta>0.5){outColor=vec4(1.0,0.0,1.0,1.0);return;}float t=clamp((v_value+20.0)/90.0,0.0,1.0);if(u_mode>0.5)t=smoothstep(0.0,1.0,t);if(u_mode>1.5)t=smoothstep(0.08,0.92,t);outColor=texture(u_palette,vec2(t,0.5));outColor.a*=u_opacity;}`;
