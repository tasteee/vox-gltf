import voxelTriangulation from 'voxel-triangulation'
import zeros from 'zeros'
import { flatten } from 'ramda'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { Blob, FileReader } from 'vblob'
import readVox from 'vox-reader'
import fs from 'fs/promises'
import fss from 'fs'
import { interpreter } from './interpreter.js'

type RgbaValueT = {
  r: number
  g: number
  b: number
  a: number
}

type RgbaT = {
  values: RgbaValueT[]
}

type SizeT = {
  x: number
  y: number
  z: number
}

type XyziValueT = {
  x: number
  y: number
  z: number
  i: number
}

type XyziT = {
  numVoxels: number
  values: XyziValueT[]
}

type VoxelDataT = {
  rgba: RgbaT
  size: SizeT
  xyzi: XyziT
}

type MainOptionsT = {
  input: string
  output: string
}

type TriangulationResultT = {
  vertices: number[]
  normals: number[]
  indices: number[]
  voxelValues: number[]
}

const DEFAULT_COLOR = [0, 0, 0]

const setupGlobals = () => {
  // @ts-ignore
  global.window = global
  global.THREE = THREE
  global.Blob = Blob
  global.FileReader = FileReader
}

const normalizeColors = (colors: RgbaValueT[]): number[][] => {
  return colors.map((color) => [
    color.r / 255.0,
    color.g / 255.0,
    color.b / 255.0,
  ])
}

const createGeometry = (
  triangulationResult: TriangulationResultT,
  colors: number[][],
) => {
  const geometry = new THREE.BufferGeometry()
  const { vertices, normals, indices, voxelValues } = triangulationResult

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(vertices), 3),
  )

  geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(new Float32Array(normals), 3),
  )

  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(
      new Float32Array(flatten(voxelValues.map((v) => colors[v]))),
      3,
    ),
  )

  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))

  return geometry
}

const createMaterial = () => {
  return new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 1.0,
    metalness: 1.0,
  })
}

type VoxT = { rgba: RgbaT; size: SizeT; xyzi: XyziT }
type CallbackT = (gltfData: any) => void
type OptionsT = { vox: VoxT; callback: CallbackT }

const voxToGLTF = (options: OptionsT) => {
  try {
    setupGlobals()
    const voxelData: XyziValueT[] = options.vox.xyzi.values
    const size: SizeT = options.vox.size
    const rgba: RgbaValueT[] = options.vox.rgba.values

    if (!voxelData.length || !size.x || !rgba.length) {
      console.error('Feta error: Missing required voxel data.')
      return
    }

    const voxels = zeros([size.x, size.y, size.z])
    voxelData.forEach(({ x, y, z, i }) => voxels.set(x, y, z, i))
    const transposedVoxels = voxels.transpose(1, 2, 0)
    const triangulationResult = voxelTriangulation(transposedVoxels)
    const normalizedColors = [DEFAULT_COLOR, ...normalizeColors(rgba)]
    const geometry = createGeometry(triangulationResult, normalizedColors)
    const material = createMaterial()
    const mesh = new THREE.Mesh(geometry, material)
    const exporter = new GLTFExporter()
    const parseOptions = { binary: global.binary }

    const callback = (gltfData) => {
      console.log('GLTF export successful')
      options.callback(gltfData)
    }

    exporter.parse(mesh, callback, parseOptions)
  } catch (error) {
    console.error('Error in voxToGLTF:', error)
  }
}

export const voxGltf = async (options: MainOptionsT) => {
  try {
    const inputPath = options.input;
    const outputPath = options.output;
    const modelData = await fs.readFile(inputPath)
    const vox = readVox(modelData) as unknown as VoxelDataT

    const callback = (gltfData) => {
      const gltfString = JSON.stringify(gltfData)
      fss.writeFileSync(outputPath, gltfString)
      console.log(`✅ Converted ${options.input} to ${options.output}.`)
    }

    voxToGLTF({ vox, callback })
  } catch (error) {
    console.error('❌ Error in main:', error)
  }
}

export { interpreter }