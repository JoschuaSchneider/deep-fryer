export type Transformer = (
  imageData: ImageData,
  threshold: number
) => Promise<ImageData>

export type TransformerNames = keyof typeof transformations

export type WorkerMessage = {
  imageData: ImageData
  transformName: keyof typeof transformations
  threshold: number
}

const grayscaleLuminanceHelper = (
  imageData: ImageData,
  resultImageData: ImageData
) => {
  const lumR = []
  const lumG = []
  const lumB = []
  for (let i = 0; i < 256; i++) {
    lumR[i] = i * 0.299
    lumG[i] = i * 0.587
    lumB[i] = i * 0.114
  }

  for (let i = 0; i < imageData.data.length; i += 4) {
    resultImageData.data[i] = lumR[imageData.data[i]]
    resultImageData.data[i + 1] = lumR[imageData.data[i]]
    resultImageData.data[i + 2] = lumR[imageData.data[i]]
  }
}

const bayer: Transformer = async (
  imageData: ImageData,
  threshold: number
): Promise<ImageData> => {
  const resultImageData = new ImageData(
    Uint8ClampedArray.from(imageData.data),
    imageData.width,
    imageData.height
  )

  grayscaleLuminanceHelper(imageData, resultImageData)

  const bayerThresholdMap = [
    [15, 135, 45, 165],
    [195, 75, 225, 105],
    [60, 180, 30, 150],
    [240, 120, 210, 90]
  ]

  for (let i = 0; i < imageData.data.length; i += 4) {
    const x = (i / 4) % imageData.width
    const y = Math.floor(i / 4 / imageData.width)
    const mapped = Math.floor(
      (imageData.data[i] + bayerThresholdMap[x % 4][y % 4]) / 2
    )
    const currentValue = mapped < threshold ? 0 : 255

    resultImageData.data[i] = currentValue
    resultImageData.data[i + 1] = currentValue
    resultImageData.data[i + 2] = currentValue
  }

  return resultImageData
}

const bayerRGB: Transformer = async (
  imageData: ImageData,
  threshold: number
): Promise<ImageData> => {
  const resultImageData = new ImageData(
    Uint8ClampedArray.from(imageData.data),
    imageData.width,
    imageData.height
  )

  grayscaleLuminanceHelper(imageData, resultImageData)

  const bayerThresholdMap = [
    [15, 135, 45, 165],
    [195, 75, 225, 105],
    [60, 180, 30, 150],
    [240, 120, 210, 90]
  ]

  for (let i = 0; i < imageData.data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      const x = (i / 4) % imageData.width
      const y = Math.floor(i / 4 / imageData.width)
      const mapped = Math.floor(
        (imageData.data[i + j] + bayerThresholdMap[x % 4][y % 4]) / 2
      )
      resultImageData.data[i + j] = mapped < threshold ? 0 : 255
    }
  }

  return resultImageData
}

const clampGrayscale: Transformer = async (
  imageData: ImageData,
  threshold: number
): Promise<ImageData> => {
  const resultImageData = new ImageData(
    Uint8ClampedArray.from(imageData.data),
    imageData.width,
    imageData.height
  )

  const clampValues = [0, 50, 100, 150, 200, 255]

  for (let i = 0; i < imageData.data.length; i += 4) {
    const currentValue = clampValues.reduce((a, b) => {
      return Math.abs(b - imageData.data[i]) < Math.abs(a - imageData.data[i])
        ? b
        : a
    }, 0)

    resultImageData.data[i] = currentValue
    resultImageData.data[i + 1] = currentValue
    resultImageData.data[i + 2] = currentValue
  }

  return resultImageData
}

const clamp: Transformer = async (
  imageData: ImageData,
  threshold: number
): Promise<ImageData> => {
  const resultImageData = new ImageData(
    Uint8ClampedArray.from(imageData.data),
    imageData.width,
    imageData.height
  )

  const clampValues = [0, 50, 100, 150, 200, 255]

  for (let i = 0; i < imageData.data.length; i += 4) {
    const currentValueR = clampValues.reduce((a, b) => {
      return Math.abs(b - imageData.data[i]) < Math.abs(a - imageData.data[i])
        ? b
        : a
    }, 0)
    const currentValueG = clampValues.reduce((a, b) => {
      return Math.abs(b - imageData.data[i + 1]) <
        Math.abs(a - imageData.data[i + 1])
        ? b
        : a
    }, 0)
    const currentValueB = clampValues.reduce((a, b) => {
      return Math.abs(b - imageData.data[i + 2]) <
        Math.abs(a - imageData.data[i + 2])
        ? b
        : a
    }, 0)

    resultImageData.data[i] = currentValueR
    resultImageData.data[i + 1] = currentValueG
    resultImageData.data[i + 2] = currentValueB
  }

  return resultImageData
}

const invert: Transformer = async (
  imageData: ImageData,
  threshold: number
): Promise<ImageData> => {
  const resultImageData = new ImageData(
    Uint8ClampedArray.from(imageData.data),
    imageData.width,
    imageData.height
  )

  for (let i = 0; i < imageData.data.length; i += 4) {
    const currentValueR = 256 - imageData.data[i]
    const currentValueG = 256 - imageData.data[i + 1]
    const currentValueB = 256 - imageData.data[i + 2]

    resultImageData.data[i] = currentValueR
    resultImageData.data[i + 1] = currentValueG
    resultImageData.data[i + 2] = currentValueB
  }

  return resultImageData
}

const invertShifted: Transformer = async (
  imageData: ImageData,
  threshold: number
): Promise<ImageData> => {
  const resultImageData = new ImageData(
    Uint8ClampedArray.from(imageData.data),
    imageData.width,
    imageData.height
  )

  for (let i = 0; i < imageData.data.length; i += 4) {
    const currentValueR = 256 - imageData.data[i + 2]
    const currentValueG = 256 - imageData.data[i]
    const currentValueB = 256 - imageData.data[i + 1]

    resultImageData.data[i] = currentValueR
    resultImageData.data[i + 1] = currentValueG
    resultImageData.data[i + 2] = currentValueB
  }

  return resultImageData
}

const grayscale: Transformer = async (
  imageData: ImageData,
  threshold: number
): Promise<ImageData> => {
  const resultImageData = new ImageData(
    Uint8ClampedArray.from(imageData.data),
    imageData.width,
    imageData.height
  )

  grayscaleLuminanceHelper(imageData, resultImageData)

  for (let i = 0; i < imageData.data.length; i += 4) {
    const currentValue = imageData.data[i] > threshold ? 256 : 0

    resultImageData.data[i] = currentValue
    resultImageData.data[i + 1] = currentValue
    resultImageData.data[i + 2] = currentValue
  }

  return resultImageData
}

const random: Transformer = async (
  imageData: ImageData,
  threshold: number
): Promise<ImageData> => {
  const resultImageData = new ImageData(
    Uint8ClampedArray.from(imageData.data),
    imageData.width,
    imageData.height
  )

  grayscaleLuminanceHelper(imageData, resultImageData)

  for (let i = 0; i < imageData.data.length; i += 4) {
    const currentValue = imageData.data[i] > Math.random() * threshold ? 256 : 0

    resultImageData.data[i] = currentValue
    resultImageData.data[i + 1] = currentValue
    resultImageData.data[i + 2] = currentValue
  }

  return resultImageData
}

const transformations = {
  bayer,
  bayerRGB,
  clampGrayscale,
  clamp,
  grayscale,
  random,
  invert,
  invertShifted
}

self.addEventListener('message', (message: MessageEvent<WorkerMessage>) => {
  const transformer = transformations[message.data.transformName]
  transformer(message.data.imageData, message.data.threshold).then((result) => {
    postMessage(result)
  })
})
