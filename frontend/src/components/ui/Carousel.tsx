import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from 'react'
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from 'embla-carousel-react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = HTMLAttributes<HTMLDivElement> & {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: 'horizontal' | 'vertical'
  setApi?: (api: CarouselApi) => void
}

type CarouselContextValue = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: CarouselApi
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
  orientation: 'horizontal' | 'vertical'
}

const CarouselContext = createContext<CarouselContextValue | null>(null)

function useCarousel() {
  const context = useContext(CarouselContext)

  if (!context) {
    throw new Error('Os componentes do Carousel precisam estar dentro de <Carousel>.')
  }

  return context
}

export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(
  (
    {
      orientation = 'horizontal',
      opts,
      plugins,
      setApi,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const [carouselRef, api] = useEmblaCarousel(
      { ...opts, axis: orientation === 'horizontal' ? 'x' : 'y' },
      plugins,
    )
    const [canScrollPrev, setCanScrollPrev] = useState(false)
    const [canScrollNext, setCanScrollNext] = useState(false)

    const onSelect = useCallback((emblaApi: NonNullable<CarouselApi>) => {
      setCanScrollPrev(emblaApi.canScrollPrev())
      setCanScrollNext(emblaApi.canScrollNext())
    }, [])

    const scrollPrev = useCallback(() => api?.scrollPrev(), [api])
    const scrollNext = useCallback(() => api?.scrollNext(), [api])

    useEffect(() => {
      if (!api || !setApi) return
      setApi(api)
    }, [api, setApi])

    useEffect(() => {
      if (!api) return
      const frame = requestAnimationFrame(() => onSelect(api))
      api.on('reInit', onSelect)
      api.on('select', onSelect)

      return () => {
        cancelAnimationFrame(frame)
        api.off('reInit', onSelect)
        api.off('select', onSelect)
      }
    }, [api, onSelect])

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api,
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
          orientation,
        }}
      >
        <div
          ref={ref}
          role="region"
          aria-roledescription="carrossel"
          className={`relative w-full min-w-0 max-w-full overflow-hidden ${className}`}
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  },
)
Carousel.displayName = 'Carousel'

export const CarouselContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div ref={carouselRef} className="w-full min-w-0 max-w-full overflow-hidden">
      <div
        ref={ref}
        className={`flex w-full min-w-0 ${
          orientation === 'horizontal' ? '' : '-mt-4 flex-col'
        } ${className}`}
        {...props}
      />
    </div>
  )
})
CarouselContent.displayName = 'CarouselContent'

export const CarouselItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => {
    const { orientation } = useCarousel()

    return (
      <div
        ref={ref}
        role="group"
        aria-roledescription="slide"
        className={`w-full min-w-0 shrink-0 grow-0 basis-full ${
          orientation === 'horizontal' ? '' : 'pt-4'
        } ${className}`}
        {...props}
      />
    )
  },
)
CarouselItem.displayName = 'CarouselItem'

type CarouselControlProps = ButtonHTMLAttributes<HTMLButtonElement>

export const CarouselPrevious = forwardRef<HTMLButtonElement, CarouselControlProps>(
  ({ className = '', children, ...props }, ref) => {
    const { orientation, scrollPrev, canScrollPrev } = useCarousel()

    return (
      <button
        ref={ref}
        type="button"
        aria-label="Imagem anterior"
        disabled={!canScrollPrev}
        onClick={scrollPrev}
        className={`absolute left-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-verde-900/80 text-white shadow-lg backdrop-blur transition hover:bg-verde disabled:pointer-events-none disabled:opacity-40 ${
          orientation === 'horizontal'
          ? ''
            : '-top-3 left-1/2 -translate-x-1/2 rotate-90'
        } ${className}`}
        {...props}
      >
        {children ?? <ArrowLeft className="size-5" aria-hidden="true" />}
      </button>
    )
  },
)
CarouselPrevious.displayName = 'CarouselPrevious'

export const CarouselNext = forwardRef<HTMLButtonElement, CarouselControlProps>(
  ({ className = '', children, ...props }, ref) => {
    const { orientation, scrollNext, canScrollNext } = useCarousel()

    return (
      <button
        ref={ref}
        type="button"
        aria-label="Próxima imagem"
        disabled={!canScrollNext}
        onClick={scrollNext}
        className={`absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-verde-900/80 text-white shadow-lg backdrop-blur transition hover:bg-verde disabled:pointer-events-none disabled:opacity-40 ${
          orientation === 'horizontal'
          ? ''
            : '-bottom-3 left-1/2 -translate-x-1/2 rotate-90'
        } ${className}`}
        {...props}
      >
        {children ?? <ArrowRight className="size-5" aria-hidden="true" />}
      </button>
    )
  },
)
CarouselNext.displayName = 'CarouselNext'

export function CarouselDots({ count }: { count: number }) {
  const { api } = useCarousel()
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!api) return

    const updateSelectedIndex = () => setSelectedIndex(api.selectedScrollSnap())
    const frame = requestAnimationFrame(updateSelectedIndex)
    api.on('select', updateSelectedIndex)
    api.on('reInit', updateSelectedIndex)

    return () => {
      cancelAnimationFrame(frame)
      api.off('select', updateSelectedIndex)
      api.off('reInit', updateSelectedIndex)
    }
  }, [api])

  return (
    <div className="mt-4 flex justify-center gap-2" aria-label="Selecionar imagem">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Ir para a imagem ${index + 1}`}
          aria-current={selectedIndex === index ? 'true' : undefined}
          onClick={() => api?.scrollTo(index)}
          className={`size-2.5 rounded-full transition ${
            selectedIndex === index
              ? 'w-7 bg-verde'
              : 'bg-verde/25 hover:bg-verde/50'
          }`}
        />
      ))}
    </div>
  )
}
