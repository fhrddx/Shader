import { AxesHelper, Intersection, Mesh, PerspectiveCamera, Raycaster, RepeatWrapping, Scene, Vector2, WebGLRenderer } from "three";
import { IGeoWorld } from "../interfaces/IGeoWorld";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Sizes from "../Utils/Sizes";
import { Basic } from "../world/Basic";
import GeoMap from "./GeoMap";
import { mapInfo, mapOptions } from "../types";
import { Resources } from "../world/Resources";
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import shortNameMap from "./ShortNameMap";

export default class GeoWorld {
  private scene: Scene;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private controls: OrbitControls;
  private sizes: Sizes;
  private resources: Resources;
  
  constructor(option: IGeoWorld) {
    const basic = new Basic(option.dom);
    this.scene = basic.scene;
    this.camera = basic.camera;
    this.camera.position.set(0, -200, 250);
    this.renderer = basic.renderer;
    this.controls = basic.controls;

    this.sizes = new Sizes({ dom: option.dom })
    this.sizes.$on('resize', () => {
      this.renderer.setSize(Number(this.sizes.viewport.width), Number(this.sizes.viewport.height));
      this.camera.aspect = Number(this.sizes.viewport.width) / Number(this.sizes.viewport.height);
      this.camera.updateProjectionMatrix();
    })

    this.resources = new Resources(async () => {
      const sideTexture = this.resources.textures.side;
      this.createMap(sideTexture, sideTexture);
    })
  }

  createMap(gridTexture, gridBlackTexture){
    this.render();
  }

  render() {
    requestAnimationFrame(this.render.bind(this));
    this.renderer.render(this.scene, this.camera);
    this.controls && this.controls.update();
  }
}