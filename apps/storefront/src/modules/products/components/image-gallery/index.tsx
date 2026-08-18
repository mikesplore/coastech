"use client"

import { HttpTypes } from "@medusajs/types"
import { Container } from "@modules/common/components/ui"
import Image from "next/image"
import { useState } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [zoom, setZoom] = useState({ x: 50, y: 50, active: false })
  const activeImage = images[activeIndex] ?? images[0]

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    setZoom({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
      active: true,
    })
  }

  if (!images.length) {
    return <Container className="relative aspect-square w-full rounded-lg bg-[#f5f5f5]" />
  }

  return (
    <div className="relative">
      <Container
        className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#f5f5f5]"
        id={activeImage.id}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setZoom((current) => ({ ...current, active: false }))}
      >
        <Image
          src={activeImage.url}
          priority
          className="absolute inset-0 object-contain transition-transform duration-150 ease-out"
          alt="Product image"
          fill
          sizes="(max-width: 1024px) 100vw, 55vw"
          style={{
            transform: zoom.active ? "scale(1.8)" : "scale(1)",
            transformOrigin: `${zoom.x}% ${zoom.y}%`,
          }}
        />
        {images.length > 1 && <>
          <button type="button" aria-label="Previous product image" onClick={() => setActiveIndex((index) => (index - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl shadow hover:bg-white">‹</button>
          <button type="button" aria-label="Next product image" onClick={() => setActiveIndex((index) => (index + 1) % images.length)} className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl shadow hover:bg-white">›</button>
        </>}
      </Container>
      <div className="mt-4 grid grid-cols-5 gap-3">
        {images.map((image, index) => <button type="button" key={image.id} aria-label={`Show product image ${index + 1}`} onClick={() => setActiveIndex(index)} className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-white ${index === activeIndex ? "border-orange-600" : "border-gray-200"}`}><Image src={image.url} alt={`Product thumbnail ${index + 1}`} fill className="object-contain p-2" sizes="120px" /></button>)}
      </div>
    </div>
  )
}

export default ImageGallery
