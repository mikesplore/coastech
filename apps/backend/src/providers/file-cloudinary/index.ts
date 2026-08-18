import { createHash } from "node:crypto"
import { PassThrough, Readable } from "node:stream"
import { AbstractFileProviderService, ModuleProvider, Modules } from "@medusajs/framework/utils"
import type { FileTypes } from "@medusajs/framework/types"

type CloudinaryOptions = {
  cloud_name: string
  api_key: string
  api_secret: string
  folder?: string
}

type CloudinaryUploadResponse = {
  secure_url: string
  public_id: string
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90)
}

function contentTypeExtension(mimeType: string) {
  if (mimeType === "image/png") return "png"
  if (mimeType === "image/webp") return "webp"
  if (mimeType === "image/gif") return "gif"
  return "jpg"
}

class CloudinaryFileProvider extends AbstractFileProviderService {
  static identifier = "cloudinary"

  protected options_: CloudinaryOptions

  constructor(_: unknown, options: CloudinaryOptions) {
    super()
    this.options_ = options
  }

  static validateOptions(options: CloudinaryOptions) {
    for (const key of ["cloud_name", "api_key", "api_secret"] as const) {
      if (!options?.[key]) throw new Error(`Cloudinary file provider requires ${key}`)
    }
  }

  private folder() {
    return this.options_.folder ?? "coastech/products"
  }

  private deliveryUrl(publicId: string) {
    return `https://res.cloudinary.com/${this.options_.cloud_name}/image/upload/${publicId}.webp`
  }

  private signedParams(params: Record<string, string>) {
    const serialized = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&")
    return createHash("sha1").update(serialized + this.options_.api_secret).digest("hex")
  }

  private async uploadBuffer(buffer: Buffer, filename: string, mimeType: string) {
    const digest = createHash("sha1").update(buffer).digest("hex").slice(0, 16)
    const baseName = slugify(filename.replace(/\.[^.]+$/, "")) || "file"
    const publicId = `${this.folder()}/${baseName}-${digest}`
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const params = {
      folder: this.folder(),
      overwrite: "true",
      public_id: publicId,
      timestamp,
      transformation: "c_limit,w_1400,h_1400,q_75,f_webp",
    }
    const form = new URLSearchParams({
      file: `data:${mimeType};base64,${buffer.toString("base64")}`,
      ...params,
      api_key: this.options_.api_key,
      signature: this.signedParams(params),
    })
    const response = await fetch(`https://api.cloudinary.com/v1_1/${this.options_.cloud_name}/image/upload`, {
      method: "POST",
      body: form,
    })
    if (!response.ok) throw new Error(`Cloudinary upload failed with status ${response.status}`)
    return await response.json() as CloudinaryUploadResponse
  }

  async upload(file: FileTypes.ProviderUploadFileDTO): Promise<FileTypes.ProviderFileResultDTO> {
    const result = await this.uploadBuffer(Buffer.from(file.content, "base64"), file.filename, file.mimeType)
    return { key: result.public_id, url: result.secure_url }
  }

  async delete(files: FileTypes.ProviderDeleteFileDTO | FileTypes.ProviderDeleteFileDTO[]) {
    const entries = Array.isArray(files) ? files : [files]
    await Promise.all(entries.map(async ({ fileKey }) => {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const params = { public_id: fileKey, timestamp }
      const form = new URLSearchParams({ ...params, api_key: this.options_.api_key, signature: this.signedParams(params) })
      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.options_.cloud_name}/image/destroy`, { method: "POST", body: form })
      if (!response.ok) throw new Error(`Cloudinary delete failed with status ${response.status}`)
    }))
  }

  async getPresignedDownloadUrl(file: FileTypes.ProviderGetFileDTO) {
    return this.deliveryUrl(file.fileKey)
  }

  async getAsBuffer(file: FileTypes.ProviderGetFileDTO) {
    const response = await fetch(this.deliveryUrl(file.fileKey))
    if (!response.ok) throw new Error(`Cloudinary download failed with status ${response.status}`)
    return Buffer.from(await response.arrayBuffer())
  }

  async getDownloadStream(file: FileTypes.ProviderGetFileDTO) {
    return Readable.from(await this.getAsBuffer(file))
  }

  async getUploadStream(file: FileTypes.ProviderUploadStreamDTO) {
    const stream = new PassThrough()
    const chunks: Buffer[] = []
    stream.on("data", (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    const publicId = `${this.folder()}/${slugify(file.filename)}-${Date.now()}`
    const promise = new Promise<FileTypes.ProviderFileResultDTO>((resolve, reject) => {
      stream.on("finish", async () => {
        try {
          const result = await this.uploadBuffer(Buffer.concat(chunks), file.filename, file.mimeType)
          resolve({ key: result.public_id, url: result.secure_url })
        } catch (error) {
          reject(error)
        }
      })
      stream.on("error", reject)
    })
    return { writeStream: stream, promise, url: this.deliveryUrl(publicId), fileKey: publicId }
  }

  async getPresignedUploadUrl(file: FileTypes.ProviderGetPresignedUploadUrlDTO) {
    return { url: "/admin/uploads", key: file.filename }
  }
}

export default ModuleProvider(Modules.FILE, {
  services: [CloudinaryFileProvider],
})
