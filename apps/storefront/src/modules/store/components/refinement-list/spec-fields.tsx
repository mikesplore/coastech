"use client"

import { SpecFilterField } from "@lib/data/specification-filters"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export default function SpecFields({ fields }: { fields: SpecFilterField[] }) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams()
  const update = (field: SpecFilterField, value: string) => { const params = new URLSearchParams(searchParams.toString()); if (value) params.set(`spec_${field.name}`, value); else params.delete(`spec_${field.name}`); params.delete("page"); router.push(`${pathname}?${params.toString()}`) }
  return <div className="space-y-4 border-t border-gray-200 pt-4"><p className="text-sm font-bold text-gray-900">Specifications</p>{fields.slice(0, 8).map((field) => { let options: string[] = []; try { options = field.enum_values ? JSON.parse(field.enum_values) : [] } catch {} return <label key={field.id} className="block text-xs text-gray-600"><span className="mb-1 block font-semibold text-gray-700">{field.label}</span>{options.length ? <select defaultValue={searchParams.get(`spec_${field.name}`) ?? ""} onChange={(event) => update(field, event.target.value)} className="w-full border border-gray-300 bg-white p-2"><option value="">All</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input defaultValue={searchParams.get(`spec_${field.name}`) ?? ""} onBlur={(event) => update(field, event.target.value)} placeholder={field.unit ?? "Any value"} className="w-full border border-gray-300 bg-white p-2" />}</label>})}</div>
}
