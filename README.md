# vox-gltf

Modern vox to gltf converter. Works with `version: 200` vox files. Easy peasy.

## Install

```
npm i vox-gltf
```

## Usage

```js
import { voxGltf } from 'vox-gltf'

voxGltf({
  input: './models/bush-3.vox',
  output: './models/bush-3.gltf',
})
```

```js
import { voxGltf } from 'vox-gltf'

async function convertVoxFiles() {
  const conversions = [
    // Paths will be treated with path.join(process.cwd(), <path>)
    { input: './models/kitten.vox', output: './models/kitten.gltf' },
    { input: './models/jetpack.vox', output: './models/jetpack.gltf' },
  ]

  for (const conversion of conversions) {
    await voxGltf(conversion)
  }
}

convertVoxFiles()
```