import { HttpTypes } from "@medusajs/types"
import { Container } from "@modules/common/components/ui"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  return (
    <div className="relative">
      <Container className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#f5f5f5]" id={images[0]?.id}>
        {images[0]?.url && <Image src={images[0].url} priority className="absolute inset-0 object-contain" alt="Product image" fill sizes="(max-width: 1024px) 100vw, 55vw" />}
      </Container>
      <div className="mt-4 grid grid-cols-5 gap-3">
        {images.slice(0, 5).map((image, index) => <Container key={image.id} className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-white ${index === 0 ? "border-orange-600" : "border-gray-200"}`}><Image src={image.url} alt={`Product thumbnail ${index + 1}`} fill className="object-contain p-2" sizes="120px" /></Container>)}
        {images.length > 5 && <div className="grid aspect-square place-items-center rounded-lg border border-gray-200 text-sm text-gray-600">+{images.length - 5} Photos</div>}
      </div>
    </div>
  )
}

export default ImageGallery
