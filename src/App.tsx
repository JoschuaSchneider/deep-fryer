import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { TransformerNames } from './compute.worker'
import ComputeWorker from './compute.worker?worker'

import chair from './public/chair.webp'
import meme from './public/meme.jpg'
import joy from './public/joy.png'

const images = [chair, meme, joy]

const transformations: TransformerNames[] = [
  'grayscale',
  'random',
  'bayer',
  'bayerRGB',
  'clampGrayscale',
  'clamp',
  'invert',
  'invertShifted'
]

const imageToImageData = async (imageUrl: string) => {
  const imageElement = document.createElement('img')
  imageElement.src = imageUrl

  await new Promise((resolve, reject) => {
    imageElement.onload = resolve
    imageElement.onerror = reject
  })

  const canvas = document.createElement('canvas')

  canvas.width = imageElement.naturalWidth
  canvas.height = imageElement.naturalHeight
  const context = canvas.getContext('2d')
  context?.drawImage(imageElement, 0, 0)

  return context?.getImageData(0, 0, canvas.width, canvas.height) ?? null
}

const applyImageDataToCanvas = (
  imageData: ImageData,
  canvas: HTMLCanvasElement
) => {
  canvas.width = imageData.width
  canvas.height = imageData.height
  const context = canvas.getContext('2d')
  context?.putImageData(imageData, 0, 0)
}

const workers: Worker[] = transformations.map(() => new ComputeWorker())

function useDebouncedValue<T>(value: T, delay = 100) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timeout)
    }
  }, [value])

  return debouncedValue
}

function App() {
  const [image, setImage] = useState(images[0])
  const [imageData, setImageData] = useState<ImageData | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const resultRefs = useRef<(HTMLCanvasElement | null)[]>(
    transformations.map(() => null)
  )
  const [threshhold, setThreshhold] = useState(150)
  const debouncedThreshold = useDebouncedValue(threshhold)

  const loadImageFromFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const onSelectImage = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      loadImageFromFile(event.target.files[0])
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const imageData = await imageToImageData(image)

      if (imageData && canvasRef.current) {
        setImageData(imageData)
      }
    }
    load()
  }, [canvasRef.current, image])

  useEffect(() => {
    /**
     * Memory leak factory :)
     */
    for (let i = 0; i < transformations.length; i++) {
      workers[i].addEventListener('message', (message) => {
        const resRef = resultRefs.current[i]
        if (resRef) {
          applyImageDataToCanvas(message.data, resRef)
        }
      })
    }

    document.addEventListener('paste', (event) => {
      const items = event.clipboardData?.items ?? []

      if (items[0]) {
        if (/^image\/(p?jpeg|gif|png|webp)$/i.test(items[0].type)) {
          const file = items[0].getAsFile()
          if (file) {
            loadImageFromFile(file)
          }
        }
      }
    })
  }, [])

  useEffect(() => {
    if (imageData) {
      for (let i = 0; i < transformations.length; i++) {
        workers[i].postMessage({
          imageData,
          threshold: debouncedThreshold,
          transformName: transformations[i]
        })
      }
    }
  }, [debouncedThreshold, imageData])

  useEffect(() => {
    if (canvasRef.current && imageData) {
      applyImageDataToCanvas(imageData, canvasRef.current)
    }
  }, [imageData, canvasRef])

  return (
    <div className="bg-gray-50">
      <div className="flex sticky top-0 z-10 gap-4 py-1 px-2 w-full bg-white/75">
        <input
          type="range"
          min="0"
          max="255"
          value={threshhold}
          onChange={(e) => setThreshhold(e.target.valueAsNumber)}
        />
        <p>Threshold: {threshhold}</p>
        <p>
          {(imageData?.width ?? 0) * (imageData?.height ?? 0)} Pixel (
          {(imageData?.width ?? 0) * (imageData?.height ?? 0) * 3} RGB Values)
        </p>
        {images.map((image, index) => (
          <button
            key={index}
            className="px-2 bg-green-100 rounded border border-gray-100"
            onClick={() => setImage(image)}
          >
            preset {index}
          </button>
        ))}
        <div className="flex items-center pl-3 space-x-2 border-l border-gray-100">
          <p>Paste or select a file:</p>
          <input type="file" className="" onChange={onSelectImage} />
        </div>
        <a
          href="https://github.com/JoschuaSchneider/deep-fryer"
          className="ml-auto text-blue-500 hover:text-blue-600 hover:underline"
        >
          Source
        </a>
      </div>
      <div className="flex flex-wrap">
        <div className="relative">
          <canvas ref={canvasRef} />
          <div className="absolute top-0 left-0 px-2 text-white bg-black">
            original
          </div>
        </div>

        {transformations.map((transformation, index) => (
          <div key={transformation} className="relative">
            <canvas
              key={index}
              ref={(element) => (resultRefs.current[index] = element)}
            />
            <div className="absolute top-0 left-0 px-2 text-white bg-black">
              {transformation}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
