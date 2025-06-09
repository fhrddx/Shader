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
  //option 是外部传进来的，有属性：dom、回调函数callback
  private option: IGeoWorld;
  //通过Basic封装，生成 scene、camera、renderer、controls 这4个three.js最重要的概念
  private scene: Scene;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private css3DRenderer: CSS3DRenderer;
  private controls: OrbitControls;
  //尺寸监听器
  private sizes: Sizes;
  //地图参数配置
  private mapStyle: mapOptions;
  //监听页面相关的点击事件
  private raycaster: Raycaster;
  private mouse: Vector2;
  private tooltip: any;
  private backbtn: any;
  //监听页面点击事件
  private clickRaycaster: Raycaster;
  //保留射线拾取的物体
  private currentHoverMesh: Intersection;
  //资源加载器
  private resources: Resources;
  //最终创建的地图
  private map: GeoMap;
  //判断是否拖拽
  private startClientX: number;
  private startClientY: number;
  
  constructor(option: IGeoWorld) {
    this.option = option;
    this.tooltip = option.tooltip;
    this.backbtn = option.backbtn;
    //通过Basic封装，生成 scene、camera、renderer、controls 这4个three.js最重要的概念
    const basic = new Basic(option.dom);
    this.scene = basic.scene;
    this.camera = basic.camera;
    this.camera.position.set(0, -200, 250);
    this.renderer = basic.renderer;
    this.css3DRenderer = basic.css3DRenderer;
    this.controls = basic.controls;
    //加上辅助线，试一下（红色X轴，绿色Y轴，蓝色Z轴）
    //const axesHelper = new AxesHelper(200);
    //this.scene.add(axesHelper);
    //监听可视范围的尺寸
    this.sizes = new Sizes({ dom: option.dom })
    this.sizes.$on('resize', () => {
      //第1步，渲染器改变下长度、宽度，这样就不会被遮挡，会充满整个父容器
      this.renderer.setSize(Number(this.sizes.viewport.width), Number(this.sizes.viewport.height));
      this.css3DRenderer.setSize(Number(this.sizes.viewport.width), Number(this.sizes.viewport.height));
      //第2步，相机重新设置下长宽比, 否则成相会被压缩或者拉长，就会很难看
      this.camera.aspect = Number(this.sizes.viewport.width) / Number(this.sizes.viewport.height);
      this.camera.updateProjectionMatrix();
    })
    //加载完图片，创建地球，然后每一帧更新一下
    this.resources = new Resources(async () => {
      //设置一下侧边贴图（暂时没有用到，因为样式不好看）
      const sideTexture = this.resources.textures.side;
      sideTexture.wrapS = RepeatWrapping;
      sideTexture.wrapT = RepeatWrapping;
      sideTexture.repeat.set(0.1, 0.13);
      sideTexture.offset.y += 1.88
      //添加地图的参数配置
      this.mapStyle = {
        //地图表面的颜色
        planeColor: 0x00659f,
        //地图侧边的颜色
        sideColor: 0x094869,
        //地图边界线的颜色
        lineColor: 0x52b6cd,
        //hover时地图表面的颜色
        activePlaneColor: 0x36b2e9,
        //hover时地图侧边的颜色
        activeSideColor: 0x094869,
        //hover时地图边界线的颜色
        activeLineColor: 0xbfe5f4,
        //地图的厚度
        deep: 5,
        //柱体最大高度
        barheightmax: 30,
        //柱体最小高度
        barheightmin: 8,
        //地图侧边的贴图
        sideTexture: sideTexture,
        //地图光柱的贴图
        huiguangTexture: this.resources.textures.huiguang,
        //地图光圈贴图1
        guangquan01: this.resources.textures.guangquan01,
        //地图光圈贴图2
        guangquan02: this.resources.textures.guangquan02,
        //重点标注的贴图
        pointTexture: this.resources.textures.point,
        //大圈1
        rotationBorder1: this.resources.textures.rotationBorder1,
        //大圈2
        rotationBorder2: this.resources.textures.rotationBorder2,
        //轮廓描边的贴图
        pathLine: this.resources.textures.pathLine,
        //是否让外轮廓动起来
        animatedPathLine: false
      }
      this.createMap();
    })
  }

  createMap(){
    //创建地图，并将地图加入到场景之中
    const map = new GeoMap(this.mapStyle);
    map.create();
    this.scene.add(map.group);
    this.map = map;
    //隐藏loading
    this.option.callback({ eventKey: 'endloading' })
    //添加相关的事件
    this.setEvents();
    //渲染出来，每一帧都执行渲染
    this.render();
  }

  //添加相关的交互事件
  setEvents(){
    //初始化射线
    this.raycaster  = new Raycaster();
    this.mouse = new Vector2();
    //鼠标移动记录位置，注意这个如果换成renderer，反而无法触发相关的事件，想一下这里面的原因
    this.css3DRenderer.domElement.addEventListener('mousemove', e => {
      const x = e.clientX / window.innerWidth * 2 - 1;
      const y = -1 * (e.clientY / window.innerHeight) * 2 + 1;
      this.mouse.x = x;
      this.mouse.y = y;
      //更改div位置
      this.tooltip.style.left = e.clientX + 20 + 'px';
      this.tooltip.style.top = e.clientY + 5 + 'px';
    })
    //注册一下点击事件
    this.clickRaycaster = new Raycaster();
    //注意一下：点击事件，直接用 click 很难区分拖拽和点击，所以结合 mousedown 和 mouseup 一起来实现
    this.css3DRenderer.domElement.addEventListener('mousedown', e => {
      this.startClientX = e.clientX;
      this.startClientY = e.clientY;
    })
    this.css3DRenderer.domElement.addEventListener('mouseup', e => {
      const distant = Math.abs(e.clientX - this.startClientX) + Math.abs(e.clientY - this.startClientY);
      //距离太长，应该就是拖拽，这时候不执行点击事件
      if(distant > 2){
        return;
      }
      const x = e.clientX / window.innerWidth * 2 - 1;
      const y = -1 * (e.clientY / window.innerHeight) * 2 + 1;
      this.click(x, y);
    })
    //注册一下返回事件
    this.backbtn.addEventListener('click', async () => {
      const historyList = JSON.parse(localStorage.getItem('china_map_list'));
      if(!historyList){
        return;
      }
      const length = historyList.length;
      if(length < 2){
        this.backbtn.style.visibility = 'hidden';
        return;
      }
      if(length === 2){
        this.scene.remove(this.map.group);
        this.map.dispose();
        this.map.create();
        this.scene.add(this.map.group);
        this.backbtn.style.visibility = 'hidden';
        return;
      }
      historyList.pop();
      const lastItem = historyList.pop();
      //这时候，必然存在多级地图，返回按钮设置为可见
      this.backbtn.style.visibility = 'visible';
      //先改变下历史访问层级
      localStorage.setItem('china_map_list', JSON.stringify(historyList));
      //更新下地图
      this.scene.remove(this.map.group);
      this.map.dispose();
      await this.map.changeMap(lastItem);
      this.scene.add(this.map.group);
    })
  }

  //渲染函数
  render() {
    requestAnimationFrame(this.render.bind(this));
    this.renderer.render(this.scene, this.camera);
    this.css3DRenderer.render(this.scene, this.camera);
    this.controls && this.controls.update();
    this.raycasterEvent();
    this.map && this.map.tick();
  }

  //处理一下相关事件 
  raycasterEvent(){
    //通常这种情况，是因为页面初始化，光标的位移还没有被监控到，直接不处理
    if(this.mouse.x === 0 && this.mouse.y === 0){
      return;
    }
    //每一帧都发一次射线，并获取射线拾取到的物体
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      //注意，这里的 scene.children 范围太广，可以适当的减少下范围
      this.map.hoverMeshs,
      true
    );
    //没有拾取到任何物体，直接返回
    const intersectsHasData = intersects && intersects.length > 0;
    if(!intersectsHasData){
      this.mouse.x = 0;
      this.mouse.y = 0;
      this.removeHover();
      return;
    }
    //筛选出拾取到的第一个物体
    const hoverMesh = intersects.find(i => i.object && (i.object.name === 'province_mesh' || i.object.name === 'province_bar' || i.object.name === 'province_point'));
    if(!hoverMesh){
      return;
    }
    //处理一下hover事件
    this.handleHover(hoverMesh);
  }

  //处理下hover事件
  handleHover(hoverMesh: Intersection){
    //与上一次hover的物品一样，则无需任何操作
    if(hoverMesh === this.currentHoverMesh){
      return;
    }else if(this.currentHoverMesh){
      //处理上一次hover的物体，恢复其颜色等样式
      const lastHoverMeshName = this.currentHoverMesh.object.name;
      if(lastHoverMeshName === 'province_mesh'){
        (this.currentHoverMesh.object as Mesh).material[0].color.set(this.mapStyle.planeColor);
      }
    }
    //重新赋值当前hover对象
    this.currentHoverMesh = hoverMesh;
    //判断下当前hover的物体的类型
    const currentHoverMeshName = hoverMesh.object.name;
    //显示浮层
    this.showTip();
    if(currentHoverMeshName === 'province_mesh'){
      (this.currentHoverMesh.object as Mesh).material[0].color.set(this.mapStyle.activePlaneColor);
    }
  }

  //去除所有的hover事件
  removeHover(){
    if(!this.currentHoverMesh){
      return;
    }
    if(this.currentHoverMesh.object.name === 'province_mesh'){
      (this.currentHoverMesh.object as Mesh).material[0].color.set(this.mapStyle.planeColor);
    }
    this.currentHoverMesh = null;
    this.tooltip.style.visibility = 'hidden';
  }

  //显示浮层
  showTip(){
    if(!this.currentHoverMesh){
      return;
    }
    //获取当前hover的物体类型，根据name来判断
    const currentHoverMeshName = this.currentHoverMesh.object.name;
    //如果hover是省份的物体
    if(currentHoverMeshName === 'province_mesh'){
      const parent = this.currentHoverMesh.object.parent;
      if(!parent){
        return;
      }
      const parentInfo = parent.userData?.['properties'] || null;
      if(!parentInfo){
        return;
      }
      this.tooltip.textContent = parentInfo.name;
      this.tooltip.style.visibility = 'visible';
      return;
    }
    //如果hover是光柱
    if(currentHoverMeshName === 'province_bar'){
      const meshInfo = this.currentHoverMesh.object.userData?.['properties'] || null;
      if(!meshInfo){
        return;
      }
      this.tooltip.innerHTML = `
       <div>${meshInfo.name}销售额&nbsp;&nbsp;<div>
       <div>${meshInfo.value} 万元<div>
      `;
      this.tooltip.style.visibility = 'visible';
      return;
    }
    //如果hover是重要点位
    if(currentHoverMeshName === 'province_point'){
      const meshInfo = this.currentHoverMesh.object.userData?.['properties'] || null;
      if(!meshInfo){
        return;
      }
      this.tooltip.innerHTML = `
       <div>${meshInfo.name} &nbsp;&nbsp;<div>
       <div>${meshInfo.value} 万元<div>
      `;
      this.tooltip.style.visibility = 'visible';
      return;
    }
  }

  //响应点击事件
  async click(x: number, y: number){
    //每一帧都发一次射线，并获取射线拾取到的物体
    this.clickRaycaster.setFromCamera(new Vector2(x, y), this.camera);
    const intersects = this.clickRaycaster.intersectObjects(
      //注意，这里的 scene.children 范围太广，可以适当的减少下范围
      this.map.clickMeshs,
      true
    );
    //没有拾取到任何物体，直接返回
    const intersectsHasData = intersects && intersects.length > 0;
    if(!intersectsHasData){
      return;
    }
    //筛选出拾取到的第一个物体
    const clickMesh = intersects.find(i => i.object && (i.object.name === 'province_mesh' || i.object.name === 'province_bar' || i.object.name === 'province_point'));
    if(!clickMesh){
      return;
    }
    //处理一下click事件
    if(clickMesh.object.name === 'province_mesh'){
      const parent = clickMesh.object.parent;
      if(!parent){
        return;
      }
      const data = parent.userData?.['properties'] || null;
      if(!data){
        return;
      }
      //改变地图
      await this.changeMap(data);
      return;
    }
    if(clickMesh.object.name === 'province_point'){
      const data = clickMesh.object.userData['properties'];
      alert('你点击了icon标注：' + JSON.stringify(data));
      return;
    }
  }

  //改变地图
  async changeMap(data: mapInfo){
    const params = {
      code: data.code,
      name: data.name,
      center: data.center
    }
    if(data.code === 0){
      const realInfo = shortNameMap[data.name];
      if(realInfo){
        params.code = realInfo.code;
        params.name = realInfo.fullName;
        params.center = realInfo.centroid || realInfo.areaCenter;
      }
    }
    const historyList = JSON.parse(localStorage.getItem('china_map_list'));
    if(!historyList){
      return;
    }
    const length = historyList.length;
    //最多只能支持3级下钻
    if(length === 3){
      return;
    }
    //直辖市不再下转
    const cities = ['上海', '北京', '台湾', '香港', '澳门', '天津', '东莞', '海南'];
    const lastName = historyList[length - 1].name;
    let canChangeMap = true;
    for(const city of cities){
      if(lastName.indexOf(city) > -1){
        canChangeMap = false;
        break;
      }
    }
    //台湾直接不支持
    if(params.name.indexOf('台湾') > -1){
      return;
    }
    if(!canChangeMap){
      return;
    }
    //加上Loading
    this.option.callback({ eventKey: 'startloading' });
    //先销毁地图中的3d物品
    this.scene.remove(this.map.group);
    this.map.dispose();
    await this.map.changeMap(params);
    this.scene.add(this.map.group);
    //下钻后，地图层级必然是多层，返回按钮设置为可见
    this.backbtn.style.visibility = 'visible';
    //去掉Loading
    this.option.callback({ eventKey: 'endloading' });
  }
}