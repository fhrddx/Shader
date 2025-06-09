import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  Texture,
} from 'three';

type floorParams = {
  group: Group;
  grid: Texture;
  gridBlack: Texture;
};

type floorUniform = {
  diffuseColor: { value: Color };
  r: { value: number };
  halfR: { value: number };
  gridTexture: { value: Texture };
  repeat: { value: number };
  opacity: { value: number };
};

export class FloorBg {
  private config: floorParams;
  private uniforms: floorUniform;
  private needToAnimateFloor = false;
  private readonly planeSize = 350;
  private readonly repeatNum: number = 40;
  private readonly translateZ: number = -5;
  private readonly firstDefaultR: number = -50;
  private nextDefaultR: number = -150;
  private readonly maxR: number = 200;
  private readonly halfRBase: number = 5;
  private readonly reduceR: number = 100;

  constructor(params: floorParams) {
    this.config = params;
    this.uniforms = {
      diffuseColor: { value: new Color(0x30dcff) },
      r: { value: this.firstDefaultR },
      halfR: { value: this.halfRBase },
      gridTexture: { value: this.config.grid },
      repeat: { value: this.repeatNum },
      opacity: { value: 1.0 },
    };
  }

  public tick(quickly: boolean) {
    if (this.uniforms && this.needToAnimateFloor) {
      let newR = this.uniforms.r.value;
      let newHalfR = this.halfRBase;
      let opacity = 1.0;

      const step = quickly ? 0.3 : 0.5;
      this.nextDefaultR = quickly ? -200 : -150;

      if (newR >= this.maxR) {
        newR = this.nextDefaultR;
        newHalfR = this.halfRBase;
        opacity = 1.0;
      } else {
        newR += step;
        if (newR <= this.reduceR) {
          newHalfR = this.halfRBase + (10 / this.reduceR) * newR;
          opacity = 1.0;
        } else {
          newHalfR =
            this.halfRBase +
            10 -
            ((this.halfRBase + 10) / (this.maxR - this.reduceR)) * (newR - this.reduceR);
          opacity = 1.0 - (newR - this.reduceR) / (this.maxR - this.reduceR);
        }
      }

      this.uniforms.r.value = newR;
      this.uniforms.halfR.value = newHalfR;
      this.uniforms.opacity.value = opacity;
    }
  }

  public create() {
    const texture = this.config.grid;
    const alphaMap = this.config.gridBlack;
    texture.wrapS = texture.wrapT = alphaMap.wrapS = alphaMap.wrapT = RepeatWrapping;
    texture.repeat.set(this.repeatNum, this.repeatNum);
    alphaMap.repeat.set(this.repeatNum, this.repeatNum);

    const planeBg = new Mesh(
      new PlaneGeometry(this.planeSize, this.planeSize),
      new MeshBasicMaterial({
        map: texture,
        color: 0x00ffff,
        transparent: true,
        opacity: 0.05,
        alphaMap: alphaMap,
        blending: AdditiveBlending,
      }),
    );
    planeBg.translateZ(this.translateZ);
    this.config.group.add(planeBg);

    const shaderMaterial = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        //纹理坐标uv
        varying vec2 vUv;
        //顶点坐标
        varying vec3 vPosition;
        void main(){
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: `
        //纹理坐标uv
        varying vec2 vUv;
        //顶点坐标
        varying vec3 vPosition;
        //扩散光圈的颜色
        uniform vec3 diffuseColor;
        //扩散半径
        uniform float r;
        //扩散半径加减一定的范围用来染色
        uniform float halfR;
        //网格的纹理贴图
        uniform sampler2D gridTexture;
        //纹理重复次数
        uniform float repeat;
        //整体的衰减透明度
        uniform float opacity;
        void main(){
          if(r < 0.0){
            //扩散半径太小，一律变成透明
            gl_FragColor = vec4(0,0,0,0);
          }else{
            //圆心原点
            vec2 center = vec2(0.0, 0.0); 
            //距离圆心的距离
            float rDistance = distance(vPosition.xy, center);
            if(rDistance < r - halfR || rDistance > r + halfR){
              //不在光圈范围内，一律变成透明
              gl_FragColor = vec4(0,0,0,0);
            }else{
              float a;
              if(rDistance < r){
                a = (rDistance - (r - halfR)) / halfR;
              }else{
                a = 1.0 - ((rDistance - r) / halfR);
              }
              //因为水平方向、垂直方向都重复了N次，所以乘以N
              vec4 colors = texture2D(gridTexture, vUv * repeat);
              a = a * colors.a * opacity;
              gl_FragColor = vec4(diffuseColor, a);
            }
          }
        }
      `,
      transparent: true,
      depthTest: false,
    });
    const animatedPlaneBg = new Mesh(
      new PlaneGeometry(this.planeSize, this.planeSize),
      shaderMaterial,
    );
    animatedPlaneBg.translateZ(this.translateZ);
    this.config.group.add(animatedPlaneBg);

    this.needToAnimateFloor = true;
  }
}
