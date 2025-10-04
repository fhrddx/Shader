import GeoWorld from './GeoWorld/GeoWorld';

const dom: HTMLElement = document.querySelector('#earth-canvas');
if(dom){
  new GeoWorld({
    dom: dom
  })
}
