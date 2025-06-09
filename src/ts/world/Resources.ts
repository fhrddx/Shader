import { LoadingManager, Texture, TextureLoader } from 'three';
import { resources } from './Assets'

export class Resources {
  private callback: () => void;
  private manager: LoadingManager
  private textureLoader!: InstanceType<typeof TextureLoader>;
  public textures: Record<string, Texture>;

  constructor(callback: () => void) {
    this.callback = callback;
    this.setLoadingManager();
    this.textures = {};
    this.loadResources();
  }

  private setLoadingManager() {
    this.manager = new LoadingManager();
    this.manager.onStart = () => {
      console.log('开始加载资源文件')
    }
    this.manager.onProgress = (url) => {
      console.log(`正在加载：${url}`)
    }
    this.manager.onLoad = () => {
      this.callback()
    }
    this.manager.onError = url => {
      console.log('加载失败：' + url)
    }
  }

  private loadResources(): void {
    this.textureLoader = new TextureLoader(this.manager)
    resources.textures?.forEach((item) => {
      this.textureLoader.load(item.url, (t) => {
        this.textures[item.name] = t
      })
    })
  }
}