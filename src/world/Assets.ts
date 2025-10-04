
interface ITextures {
  name: string
  url: string
}

export interface IResources {
  textures?: ITextures[],
}

const filePath = '../../../static/images/'
const fileSuffix = [
  'grid',
  'gridBlack',
  'bg'
]

const textures = fileSuffix.map(item => {
  return {
    name: item,
    url: require(`../../static/images/${item}.png`),
  }
})

const resources: IResources = {
  textures
}

export {
  resources
}