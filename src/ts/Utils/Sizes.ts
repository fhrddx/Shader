import { EventEmitter } from 'pietile-eventemitter';
import { IEvents } from '../interfaces/IEvents';

type options = { dom: HTMLElement }

export default class Sizes {
  public $sizeViewport: HTMLElement

  public viewport: {
    width: number,
    height: number
  }

  public emitter: EventEmitter<IEvents>;

  constructor(options: options) {
    this.$sizeViewport = options.dom;

    this.viewport = {
      width: 0,
      height: 0
    };

    this.emitter = new EventEmitter<IEvents>()

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  $on<T extends keyof IEvents>(event: T, fun: () => void) {
    this.emitter.on(
      event,
      () => {
        fun();
      }
    )
  }

  resize() {
    this.viewport.width = this.$sizeViewport.offsetWidth;
    this.viewport.height = this.$sizeViewport.offsetHeight;
    this.emitter.emit('resize');
  }
}
