import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRatesWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import { ingestHardwareCatalog } from "./ingest-hardware";

/**
 * Seeds the Kenya computer-parts store (Set KES as default currency).
 * Idempotent: if the store "Computer Parts Shop" already exists, it skips
 * all setup and only seeds the product catalog (categories, collections, products).
 */
export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModuleService = container.resolve("product")
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  );
  const specificationsModuleService = container.resolve("specifications")
  const promotionsModuleService = container.resolve("promotions")

  // ---------------------------------------------------------------------------
  // Idempotency check: only run the full store/region/fulfillment setup once.
  // ---------------------------------------------------------------------------
  const { data: existingStores } = await query.graph({
    entity: "store",
    fields: ["id", "name"],
  });
  const alreadySeeded = existingStores.some(
    (s) => s.name === "Computer Parts Shop"
  );

  let defaultSalesChannel: { id: string } | undefined;
  let stockLocation: { id: string } | undefined;

  if (!alreadySeeded) {
    logger.info("Seeding store data...");
    const {
      result: [salesChannel],
    } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: "Online Store",
            description: "E-commerce sales channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannel;
  } else {
    logger.info("Store already exists - skipping store setup.");
    const {
      data: [channel],
    } = await query.graph({
      entity: "sales_channel",
      fields: ["id", "name"],
      filters: { name: "Online Store" },
    });
    defaultSalesChannel = channel
      ? { id: channel.id }
      : await query
          .graph({
            entity: "sales_channel",
            fields: ["id"],
          })
          .then(({ data }) => ({ id: data[0].id }));
  }

  if (!alreadySeeded) {
    const {
      result: [publishableApiKey],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Default Publishable API Key",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: publishableApiKey.id,
        add: [defaultSalesChannel!.id],
      },
    });

    const {
      result: [store],
    } = await createStoresWorkflow(container).run({
      input: {
        stores: [
          {
            name: "Computer Parts Shop",
            supported_currencies: [
              {
                currency_code: "kes",
                is_default: true,
              },
              {
                currency_code: "usd",
                is_default: false,
              },
            ],
            default_sales_channel_id: defaultSalesChannel!.id,
          },
        ],
      },
    });

    logger.info("Seeding region data...");
    const { result: regionResult } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Kenya",
            currency_code: "kes",
            countries: ["ke"],
            payment_providers: ["pp_system_default", "pp_paystack"],
          },
        ],
      },
    });
    const region = regionResult[0];

    logger.info("Seeding tax regions...");
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "ke", provider_id: "tp_system" }],
    });
    logger.info("Finished seeding tax regions.");

    logger.info("Seeding tax rates...")
    const { data: keTaxRegions } = await query.graph({
      entity: "tax_region",
      fields: ["id", "country_code"],
      filters: { country_code: "ke" },
    })
    const keTaxRegionId = keTaxRegions[0]?.id
    if (keTaxRegionId) {
      const { data: existingRates } = await query.graph({
        entity: "tax_rate",
        fields: ["id", "code", "tax_region_id"],
        filters: { tax_region_id: keTaxRegionId },
      })

      const hasVat = existingRates.some((r) => r.code === "VAT")
      if (!hasVat) {
        await createTaxRatesWorkflow(container).run({
          input: [
            {
              tax_region_id: keTaxRegionId,
              name: "VAT",
              code: "VAT",
              rate: 0.16,
              is_default: true,
              is_combinable: false,
            },
          ],
        })
      }
    }
    logger.info("Finished seeding tax rates.")

    logger.info("Seeding price lists...")
    const { data: existingPriceLists } = await query.graph({
      entity: "price_list",
      fields: ["id", "title"],
    })
    const existingPriceListTitles = new Set(existingPriceLists.map((p) => p.title))
    const priceListsToCreate = [
      {
        title: "Retail",
        description: "Default retail pricing",
        status: "active",
      },
      {
        title: "Trade",
        description: "Discounted pricing for bulk/trade buyers",
        status: "draft",
      },
    ].filter((p) => !existingPriceListTitles.has(p.title))

    if (priceListsToCreate.length > 0) {
      await createPriceListsWorkflow(container).run({
        input: {
          price_lists_data: priceListsToCreate as any,
        },
      })
    }
    logger.info("Finished seeding price lists.")

    logger.info("Seeding stock location data...");
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container
    ).run({
      input: {
        locations: [
          {
            name: "Main Shop - Nairobi",
            address: {
              city: "Nairobi",
              country_code: "KE",
              address_1: "Moi Avenue",
            },
          },
        ],
      },
    });
    stockLocation = stockLocationResult[0];

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    });

    logger.info("Seeding fulfillment data...");
    const { data: shippingProfileResult } = await query.graph({
      entity: "shipping_profile",
      fields: ["id"],
    });
    const shippingProfile = shippingProfileResult[0];

    const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Nairobi delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Kenya",
          geo_zones: [
            {
              country_code: "ke",
              type: "country",
            },
          ],
        },
      ],
    });

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    });

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Delivery",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Delivery in 2-3 days.",
            code: "standard",
          },
          prices: [
            {
              currency_code: "kes",
              amount: 500,
            },
            {
              region_id: region.id,
              amount: 500,
            },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
        {
          name: "In-Store Pickup",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Pickup",
            description: "Pick up at our Nairobi store.",
            code: "pickup",
          },
          prices: [
            {
              currency_code: "kes",
              amount: 0,
            },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
      ],
    });
    logger.info("Finished seeding fulfillment data.");

    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel!.id],
      },
    });
    logger.info("Finished seeding stock location data.");
  } else {
    // Reuse the existing shipping profile so products reference a valid one.
    logger.info("Store already exists - reusing existing shipping profile.");
  }

  // Ensure we have a stock location (for inventory levels on re-runs).
  if (!stockLocation) {
    const { data: existingLocations } = await query.graph({
      entity: "stock_location",
      fields: ["id", "name"],
    });
    stockLocation = existingLocations[0];
  }

  // ---------------------------------------------------------------------------
  // Product categories (idempotent - fetched, not recreated).
  // ---------------------------------------------------------------------------
  logger.info("Seeding product category data...");
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
  });
  const categoryByHandle = new Map(
    existingCategories.map((c) => [c.handle, c.id])
  );

  const categoriesToCreate = [
    { name: "Laptops", handle: "laptops" },
    { name: "Desktops / Pre-builts", handle: "desktops-prebuilts" },
    { name: "Components", handle: "components" },
    { name: "Peripherals", handle: "peripherals" },
    { name: "Networking", handle: "networking" },
    { name: "Accessories", handle: "accessories" },
    { name: "Motherboards", handle: "motherboards" },
    { name: "Processors (CPUs)", handle: "processors-cpus" },
    { name: "Graphics Cards (GPUs)", handle: "graphics-cards-gpus" },
    { name: "Memory (RAM)", handle: "memory-ram" },
    { name: "Storage", handle: "storage" },
    { name: "Power Supplies (PSUs)", handle: "power-supplies-psus" },
    { name: "Cases", handle: "cases" },
    { name: "Cooling", handle: "cooling" },
    { name: "Keyboards", handle: "keyboards" },
    { name: "Mice", handle: "mice" },
    { name: "Monitors", handle: "monitors" },
    { name: "Headsets/Audio", handle: "headsets-audio" },
  ];

  const missingCategories = categoriesToCreate.filter(
    (c) => !categoryByHandle.has(c.handle)
  );

  if (missingCategories.length > 0) {
    const { result: createdCategories } = await createProductCategoriesWorkflow(
      container
    ).run({
      input: {
        product_categories: missingCategories.map((c, i) => ({
          name: c.name,
          is_active: true,
          handle: c.handle,
          // Link subcategories to Components / Peripherals parent categories.
          parent_category_id: (() => {
            if (["motherboards", "processors-cpus", "graphics-cards-gpus", "memory-ram", "storage", "power-supplies-psus", "cases", "cooling"].includes(c.handle)) {
              return categoryByHandle.get("components") || null
            }
            if (["keyboards", "mice", "monitors", "headsets-audio"].includes(c.handle)) {
              return categoryByHandle.get("peripherals") || null
            }
            return null
          })(),
          rank: i + 1,
        })),
      },
    });

    createdCategories?.forEach((c) => categoryByHandle.set(c.handle, c.id));
  }
  logger.info("Finished seeding category data.");

  // ---------------------------------------------------------------------------
  // Collections - REQUIRED for the storefront home page rails.
  // ---------------------------------------------------------------------------
  logger.info("Seeding collections...");
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title", "handle"],
  });
  const collectionByHandle = new Map(
    existingCollections.map((c) => [c.handle, c.id])
  );

  const collectionsToCreate = [
    { title: "Components", handle: "components" },
    { title: "Systems", handle: "systems" },
  ];

  const missingCollections = collectionsToCreate.filter(
    (c) => !collectionByHandle.has(c.handle)
  );

  if (missingCollections.length > 0) {
    const { result: createdCollections } = await createCollectionsWorkflow(
      container
    ).run({
      input: {
        collections: missingCollections.map((c) => ({
          title: c.title,
          handle: c.handle,
        })),
      },
    });

    createdCollections?.forEach((c) => collectionByHandle.set(c.handle, c.id));
  }
  logger.info("Finished seeding collections.");

  logger.info("Seeding reusable product options...");
  const { data: existingProductOptions } = await query.graph({
    entity: "product_option",
    fields: ["id", "title"],
    filters: { is_exclusive: false },
  });
  const existingProductOptionTitles = new Set(existingProductOptions.map((option) => option.title));
  const reusableProductOptions = [
    { title: "Capacity", values: ["8GB", "16GB", "32GB", "64GB", "1TB", "2TB"] },
    { title: "Size", values: ["24-inch", "27-inch", "32-inch", "34-inch"] },
    { title: "Configuration", values: ["Standard", "Gaming", "Office"] },
  ];
  const missingProductOptions = reusableProductOptions.filter(
    (option) => !existingProductOptionTitles.has(option.title)
  );
  if (missingProductOptions.length > 0) {
    await createProductOptionsWorkflow(container).run({
      input: {
        product_options: missingProductOptions.map((option) => ({
          ...option,
          is_exclusive: false,
        })),
      },
    });
  }
  logger.info("Finished seeding reusable product options.");

  // ---------------------------------------------------------------------------
  // Products (only create if a known handle is missing).
  // ---------------------------------------------------------------------------
  logger.info("Seeding product data...");
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  const productHandles = new Set(existingProducts.map((p) => p.handle));

  const getCategoryId = (handle: string) => {
    const id = categoryByHandle.get(handle);
    if (!id) {
      throw new Error(`Category with handle "${handle}" was not found.`);
    }
    return id;
  };

  const getCollectionId = (handle: string) => {
    const id = collectionByHandle.get(handle);
    if (!id) {
      throw new Error(`Collection with handle "${handle}" was not found.`);
    }
    return id;
  };

  const componentsCollectionId = getCollectionId("components");

  // ---------------------------------------------------------------------------
  // Product tags (cross-cutting labels).
  // ---------------------------------------------------------------------------
  logger.info("Seeding product tags...")
  const desiredTags = ["gaming", "refurbished", "clearance", "office"]

  const { data: existingTags } = await query.graph({
    entity: "product_tag",
    fields: ["id", "value"],
  })
  const tagIdByValue = new Map(existingTags.map((t) => [t.value, t.id]))

  const tagsToCreate = desiredTags.filter((t) => !tagIdByValue.has(t))
  if (tagsToCreate.length > 0) {
    const createdTags = await productModuleService.createProductTags(
      tagsToCreate.map((value) => ({ value }))
    )
    createdTags.forEach((t) => tagIdByValue.set(t.value, t.id))
  }
  logger.info("Finished seeding product tags.")

  // ---------------------------------------------------------------------------
  // Specifications templates/fields (Phase 3) - category-validated, filterable specs.
  // ---------------------------------------------------------------------------
  logger.info("Seeding specification templates and fields...")

  const specTemplates = [
    {
      key: "cpu",
      name: "CPU Template",
      category_handle: "processors-cpus",
      warranty_months: 36,
      fields: [
        { name: "socket", label: "Socket", data_type: "string", is_required: true, is_filterable: true, sort_order: 10 },
        { name: "cores", label: "Cores", data_type: "number", is_required: true, is_filterable: true, sort_order: 20 },
        { name: "threads", label: "Threads", data_type: "number", is_required: true, is_filterable: true, sort_order: 30 },
        { name: "tdp_watts", label: "TDP (W)", data_type: "number", unit: "W", is_required: true, is_filterable: true, sort_order: 40 },
        { name: "integrated_graphics", label: "Integrated Graphics", data_type: "boolean", is_required: false, is_filterable: true, sort_order: 50 },
      ],
    },
    {
      key: "motherboard",
      name: "Motherboard Template",
      category_handle: "motherboards",
      warranty_months: 24,
      fields: [
        { name: "socket", label: "Socket", data_type: "string", is_required: true, is_filterable: true, sort_order: 10 },
        { name: "form_factor", label: "Form Factor", data_type: "string", is_required: true, is_filterable: true, sort_order: 20 },
        { name: "supported_ram_types", label: "Supported RAM Types", data_type: "string", is_required: true, is_filterable: true, sort_order: 30 },
        { name: "ram_slots", label: "RAM Slots", data_type: "number", is_required: false, is_filterable: true, sort_order: 40 },
        { name: "m2_slots", label: "M.2 Slots", data_type: "number", is_required: false, is_filterable: true, sort_order: 50 },
        { name: "sata_ports", label: "SATA Ports", data_type: "number", is_required: false, is_filterable: true, sort_order: 60 },
      ],
    },
    {
      key: "ram",
      name: "RAM Template",
      category_handle: "memory-ram",
      warranty_months: 24,
      fields: [
        { name: "type", label: "Type", data_type: "string", is_required: true, is_filterable: true, sort_order: 10 },
        { name: "capacity_gb", label: "Capacity (GB)", data_type: "number", unit: "GB", is_required: true, is_filterable: true, sort_order: 20 },
        { name: "speed_mhz", label: "Speed (MHz)", data_type: "number", unit: "MHz", is_required: false, is_filterable: true, sort_order: 30 },
      ],
    },
    {
      key: "gpu",
      name: "GPU Template",
      category_handle: "graphics-cards-gpus",
      warranty_months: 24,
      fields: [
        { name: "tdp_watts", label: "TDP (W)", data_type: "number", unit: "W", is_required: true, is_filterable: true, sort_order: 10 },
        { name: "length_mm", label: "Length (mm)", data_type: "number", unit: "mm", is_required: false, is_filterable: true, sort_order: 20 },
      ],
    },
    {
      key: "psu",
      name: "Power Supply Template",
      category_handle: "power-supplies-psus",
      warranty_months: 60,
      fields: [
        { name: "wattage", label: "Wattage (W)", data_type: "number", unit: "W", is_required: true, is_filterable: true, sort_order: 10 },
      ],
    },
    {
      key: "case",
      name: "Case Template",
      category_handle: "cases",
      warranty_months: 12,
      fields: [
        { name: "form_factors_supported", label: "Supported Form Factors", data_type: "string", is_required: true, is_filterable: true, sort_order: 10 },
        { name: "max_gpu_length_mm", label: "Max GPU Length (mm)", data_type: "number", unit: "mm", is_required: false, is_filterable: true, sort_order: 20 },
      ],
    },
    {
      key: "storage",
      name: "Storage Template",
      category_handle: "storage",
      warranty_months: 60,
      fields: [
        { name: "type", label: "Type", data_type: "string", is_required: true, is_filterable: true, sort_order: 10 },
        { name: "interface", label: "Interface", data_type: "string", is_required: false, is_filterable: true, sort_order: 20 },
      ],
    },
  ] as const

  const specTemplateIdByKey = new Map<string, string>()
  const specFieldIdByTemplateKeyAndName = new Map<string, Map<string, string>>()

  for (const tpl of specTemplates) {
    const categoryId = getCategoryId(tpl.category_handle)

    const existing = await specificationsModuleService.listSpecTemplates({
      category_id: categoryId,
    })

    const template =
      existing[0] ??
      (
        await specificationsModuleService.createSpecTemplates([
          {
            name: tpl.name,
            category_id: categoryId,
            warranty_months: (tpl as any).warranty_months ?? null,
          },
        ])
      )[0]

    specTemplateIdByKey.set(tpl.key, template.id)

    const existingFields = await specificationsModuleService.listSpecTemplateFields({
      template_id: template.id,
    })
    const fieldIdByName = new Map(existingFields.map((f) => [f.name, f.id]))
    const missingFields = tpl.fields.filter((f) => !fieldIdByName.has(f.name))

    if (missingFields.length > 0) {
      const created = await specificationsModuleService.createSpecTemplateFields(
        missingFields.map((f) => ({
          template_id: template.id,
          name: f.name,
          label: f.label,
          data_type: f.data_type,
          unit: (f as any).unit ?? null,
          enum_values: null,
          is_filterable: f.is_filterable ?? false,
          is_required: f.is_required ?? false,
          sort_order: f.sort_order ?? 0,
        }))
      )
      created.forEach((f) => fieldIdByName.set(f.name, f.id))
    }

    specFieldIdByTemplateKeyAndName.set(tpl.key, fieldIdByName)
  }

  logger.info("Finished seeding specification templates and fields.")

  const products = [
    {
      title: "AMD Ryzen 7 7800X3D",
      category_handle: "processors-cpus",
      description:
        "8-core gaming processor with 3D V-Cache technology. AM5 socket, 105W TDP.",
      handle: "amd-ryzen-7-7800x3d",
      weight: 100,
      sku: "CPU-AMD-7800X3D",
      price: 54999,
      metadata: {
        spec_template: "cpu",
        socket: "AM5",
        cores: 8,
        threads: 16,
        base_clock_ghz: 4.2,
        boost_clock_ghz: 5.0,
        tdp_watts: 105,
        integrated_graphics: true,
      },
    },
    {
      title: "Intel Core i5-14600K",
      category_handle: "processors-cpus",
      description:
        "14-core processor (6P+8E) with Intel UHD Graphics 770. LGA1700 socket.",
      handle: "intel-core-i5-14600k",
      weight: 100,
      sku: "CPU-INT-14600K",
      price: 47999,
      metadata: {
        spec_template: "cpu",
        socket: "LGA1700",
        cores: 14,
        threads: 20,
        base_clock_ghz: 3.5,
        boost_clock_ghz: 5.3,
        tdp_watts: 125,
        integrated_graphics: true,
      },
    },
    {
      title: "ASUS ROG STRIX B650-A Gaming WiFi",
      category_handle: "motherboards",
      description:
        "AM5 ATX motherboard with WiFi 6E, DDR5 support, PCIe 4.0, 4 RAM slots.",
      handle: "asus-rog-strix-b650-a-gaming-wifi",
      weight: 1500,
      sku: "MB-ASU-B650-A",
      price: 32999,
      metadata: {
        spec_template: "motherboard",
        socket: "AM5",
        form_factor: "ATX",
        supported_ram_types: ["DDR5"],
        ram_slots: 4,
        max_ram_gb: 192,
        pcie_slots: 3,
        m2_slots: 2,
        sata_ports: 4,
        wifi: true,
        bluetooth: true,
      },
    },
    {
      title: "MSI MAG Z790 Tomahawk WiFi",
      category_handle: "motherboards",
      description:
        "LGA1700 ATX motherboard for Intel 13th/14th gen, DDR5 support, PCIe 5.0.",
      handle: "msi-mag-z790-tomahawk-wifi",
      weight: 1600,
      sku: "MB-MSI-Z790-TOM",
      price: 38999,
      metadata: {
        spec_template: "motherboard",
        socket: "LGA1700",
        form_factor: "ATX",
        supported_ram_types: ["DDR5"],
        ram_slots: 4,
        max_ram_gb: 192,
        pcie_slots: 3,
        m2_slots: 4,
        sata_ports: 6,
        wifi: true,
        bluetooth: true,
      },
    },
    {
      title: "Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz",
      category_handle: "memory-ram",
      description:
        "High-performance DDR5 memory kit, 6000MHz CL30, optimized for AMD Ryzen 7000 series.",
      handle: "corsair-vengeance-ddr5-32gb-6000mhz",
      weight: 200,
      sku: "RAM-COR-DDR5-32-6000",
      price: 18999,
      metadata: {
        spec_template: "ram",
        type: "DDR5",
        capacity_gb: 32,
        speed_mhz: 6000,
        latency_cl: 30,
        voltage: 1.35,
        kit_configuration: "2x16GB",
        heatsink: true,
        rgb: false,
      },
    },
    {
      title: "G.Skill Trident Z5 RGB DDR5 32GB (2x16GB) 5600MHz",
      category_handle: "memory-ram",
      description:
        "Premium DDR5 memory with RGB lighting, 5600MHz CL36, compatible with Intel and AMD.",
      handle: "gskill-trident-z5-rgb-ddr5-32gb-5600mhz",
      weight: 250,
      sku: "RAM-GSK-DDR5-32-5600-RGB",
      price: 17499,
      metadata: {
        spec_template: "ram",
        type: "DDR5",
        capacity_gb: 32,
        speed_mhz: 5600,
        latency_cl: 36,
        voltage: 1.35,
        kit_configuration: "2x16GB",
        heatsink: true,
        rgb: true,
      },
    },
    {
      title: "NVIDIA GeForce RTX 4070 Super 12GB",
      category_handle: "graphics-cards-gpus",
      description:
        "High-performance graphics card with 12GB GDDR6X, ray tracing, DLSS 3.5.",
      handle: "nvidia-rtx-4070-super-12gb",
      weight: 1200,
      sku: "GPU-NV-4070-SUPER",
      price: 94999,
      metadata: {
        spec_template: "gpu",
        vram_gb: 12,
        memory_type: "GDDR6X",
        tdp_watts: 220,
        recommended_psu_watts: 650,
        pcie_interface: "PCIe 4.0 x16",
        length_mm: 260,
        slot_width: 2.5,
        display_outputs: ["HDMI 2.1", "DisplayPort 1.4a"],
      },
    },
    {
      title: "Corsair RM750e 750W 80+ Gold Fully Modular",
      category_handle: "power-supplies-psus",
      description:
        "Fully modular 750W power supply with 80+ Gold efficiency, quiet operation.",
      handle: "corsair-rm750e-750w-gold",
      weight: 1800,
      sku: "PSU-COR-RM750E",
      price: 15999,
      metadata: {
        spec_template: "psu",
        wattage: 750,
        efficiency_rating: "80+ Gold",
        modular: true,
        fully_modular: true,
        form_factor: "ATX",
        cpu_connector: "2x 8-pin EPS",
        pcie_connectors: "4x 8-pin (6+2)",
        sata_connectors: 8,
        warranty_years: 10,
      },
    },
    {
      title: "NZXT H5 Flow White",
      category_handle: "cases",
      description:
        "Mid-tower ATX case with excellent airflow, supports ATX/mATX/ITX motherboards.",
      handle: "nzxt-h5-flow-white",
      weight: 6500,
      sku: "CASE-NZXT-H5-WHT",
      price: 12999,
      metadata: {
        spec_template: "case",
        form_factors_supported: ["ATX", "Micro-ATX", "Mini-ITX"],
        max_gpu_length_mm: 365,
        max_cpu_cooler_height_mm: 165,
        included_fans: 2,
        fan_mounts_front: "3x 120mm or 2x 140mm",
        fan_mounts_rear: "1x 120mm",
        fan_mounts_top: "2x 120mm or 140mm",
        radiator_support_front: "360mm",
        radiator_support_top: "280mm",
        usb_ports: "2x USB-A 3.0, 1x USB-C",
        tempered_glass: true,
      },
    },
    {
      title: "Samsung 990 PRO 2TB NVMe SSD",
      category_handle: "storage",
      description:
        "High-speed PCIe 4.0 NVMe M.2 SSD with read speeds up to 7450 MB/s.",
      handle: "samsung-990-pro-2tb-nvme",
      weight: 100,
      sku: "SSD-SAM-990-2TB",
      price: 24999,
      metadata: {
        spec_template: "storage",
        type: "NVMe SSD",
        interface: "PCIe 4.0 x4",
        form_factor: "M.2 2280",
        capacity_gb: 2000,
        read_speed_mbs: 7450,
        write_speed_mbs: 6900,
        dram_cache: true,
        tbw: 1200,
        warranty_years: 5,
      },
    },
    {
      title: "Mechanical Keyboard (RGB)",
      category_handle: "keyboards",
      description: "Mechanical keyboard with per-key RGB and hot-swappable switches.",
      handle: "mechanical-keyboard-rgb",
      weight: 900,
      sku: "KB-MECH-RGB",
      price: 8999,
      tag_values: ["gaming"],
      metadata: {
        // This product intentionally uses purchasable variants (switch type)
        // rather than encoding everything into specs.
      },
      options: [
        {
          title: "Switch",
          values: ["Red", "Brown"],
        },
      ],
      variants: [
        {
          title: "Red Switch",
          sku: "KB-MECH-RGB-RED",
          options: { Switch: "Red" },
          price: 8999,
        },
        {
          title: "Brown Switch",
          sku: "KB-MECH-RGB-BROWN",
          options: { Switch: "Brown" },
          price: 8999,
        },
      ],
    },
  ];

  const productsToCreate = products.filter((p) => !productHandles.has(p.handle));

  if (productsToCreate.length > 0) {
    await createProductsWorkflow(container).run({
      input: {
        products: productsToCreate.map((p) => ({
          title: p.title,
          options:
            (p as any).options ??
            [
              {
                title: "Default",
                values: ["Default"],
              },
            ],
          category_ids: [getCategoryId(p.category_handle)],
          collection_id: componentsCollectionId,
          description: p.description,
          handle: p.handle,
          weight: p.weight,
          status: ProductStatus.PUBLISHED,
          images: [
            {
              url: `https://example.com/images/${p.handle}.png`,
            },
          ],
          variants:
            (p as any).variants?.map((v) => ({
              title: v.title,
              sku: v.sku,
              options: v.options,
              metadata: {
                low_stock_threshold: 5,
              },
              prices: [
                {
                  amount: v.price,
                  currency_code: "kes",
                },
              ],
            })) ??
            [
              {
                title: "Default",
                sku: p.sku,
                options: {
                  Default: "Default",
                },
                metadata: {
                  low_stock_threshold: 5,
                },
                prices: [
                  {
                    amount: p.price,
                    currency_code: "kes",
                  },
                ],
              },
            ],
          sales_channels: defaultSalesChannel
            ? [
                {
                  id: defaultSalesChannel.id,
                },
              ]
            : undefined,
          tag_ids: (p as any).tag_values
            ? (p as any).tag_values
                .map((v: string) => tagIdByValue.get(v))
                .filter(Boolean)
            : undefined,
          metadata: p.metadata,
        })),
      },
    });
  }

  const { data: productsToMap } = await query.graph({
    entity: "product",
    fields: ["id"],
  });

  if (productsToMap.length > 0 && defaultSalesChannel?.id) {
    await updateProductsWorkflow(container).run({
      input: {
        products: productsToMap.map((product) => ({
          id: product.id,
          collection_id: componentsCollectionId,
          sales_channels: [{ id: defaultSalesChannel!.id }],
        })),
      },
    });
  }

  logger.info(
    `Finished seeding product data. Created ${productsToCreate.length} products.`
  );

  logger.info("Fetching hardware catalog products...");
  await ingestHardwareCatalog({ container });

  // ---------------------------------------------------------------------------
  // Specifications values (Phase 3) - map seeded product metadata to structured values.
  // ---------------------------------------------------------------------------
  logger.info("Seeding product specification values...")

  const handlesToSeedSpecs = products.map((p) => p.handle)
  const { data: productsForSpecs } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "metadata"],
    filters: { handle: handlesToSeedSpecs },
  })
  const productIdByHandle = new Map(productsForSpecs.map((p) => [p.handle, p.id]))

  for (const p of products) {
    const productId = productIdByHandle.get(p.handle)
    if (!productId) continue

    const templateKey = (p.metadata as any)?.spec_template as string | undefined
    if (!templateKey || !specFieldIdByTemplateKeyAndName.has(templateKey)) continue

    const existingValues = await specificationsModuleService.listProductSpecValues({
      product_id: productId,
    })
    const existingFieldIds = new Set(existingValues.map((v) => v.field_id))

    const fieldIdByName = specFieldIdByTemplateKeyAndName.get(templateKey)!
    const valuesToCreate: any[] = []

    for (const [name, fieldId] of fieldIdByName.entries()) {
      if (existingFieldIds.has(fieldId)) continue
      const rawValue = (p.metadata as any)?.[name]
      if (rawValue === undefined || rawValue === null) continue

      if (typeof rawValue === "number") {
        valuesToCreate.push({
          product_id: productId,
          field_id: fieldId,
          value_number: rawValue,
        })
        continue
      }

      if (typeof rawValue === "boolean") {
        valuesToCreate.push({
          product_id: productId,
          field_id: fieldId,
          value_boolean: rawValue,
        })
        continue
      }

      if (Array.isArray(rawValue)) {
        valuesToCreate.push({
          product_id: productId,
          field_id: fieldId,
          value_text: JSON.stringify(rawValue),
        })
        continue
      }

      valuesToCreate.push({
        product_id: productId,
        field_id: fieldId,
        value_text: String(rawValue),
      })
    }

    if (valuesToCreate.length > 0) {
      await specificationsModuleService.createProductSpecValues(valuesToCreate)
    }
  }

  logger.info("Finished seeding product specification values.")

  // ---------------------------------------------------------------------------
  // Compatibility rules (Phase 5) - seed initial v1 rule set.
  // ---------------------------------------------------------------------------
  logger.info("Seeding compatibility rules...")
  const compatibilityModuleService = container.resolve("compatibility")

  const existingRules = await compatibilityModuleService.listCompatibilityRules()
  const existingRuleNames = new Set(existingRules.map((r) => r.name))

  const cpuCategoryId = getCategoryId("processors-cpus")
  const motherboardCategoryId = getCategoryId("motherboards")
  const ramCategoryId = getCategoryId("memory-ram")
  const gpuCategoryId = getCategoryId("graphics-cards-gpus")
  const psuCategoryId = getCategoryId("power-supplies-psus")
  const caseCategoryId = getCategoryId("cases")
  const storageCategoryId = getCategoryId("storage")

  const rulesToSeed = [
    {
      name: "CPU ↔ Motherboard Socket Match",
      description: "CPU socket must match motherboard socket.",
      source_category_id: cpuCategoryId,
      source_field_name: "socket",
      target_category_id: motherboardCategoryId,
      target_field_name: "socket",
      operator: "equals",
      error_message: "CPU socket must match motherboard socket",
      priority: 100,
    },
    {
      name: "RAM ↔ Motherboard RAM Type Supported",
      description: "RAM type must be supported by the motherboard.",
      source_category_id: ramCategoryId,
      source_field_name: "type",
      target_category_id: motherboardCategoryId,
      target_field_name: "supported_ram_types",
      operator: "in",
      error_message: "RAM type must be supported by the motherboard",
      priority: 90,
    },
    {
      name: "Motherboard ↔ Case Form Factor Fit",
      description: "Motherboard form factor must be supported by the case.",
      source_category_id: motherboardCategoryId,
      source_field_name: "form_factor",
      target_category_id: caseCategoryId,
      target_field_name: "form_factors_supported",
      operator: "in",
      error_message: "Motherboard form factor must be supported by the case",
      priority: 80,
    },
    {
      name: "GPU ↔ Case Length Fit",
      description: "GPU length must not exceed case maximum GPU length.",
      source_category_id: gpuCategoryId,
      source_field_name: "length_mm",
      target_category_id: caseCategoryId,
      target_field_name: "max_gpu_length_mm",
      operator: "less_than_equal",
      error_message: "GPU length must be within the case maximum GPU length",
      priority: 70,
    },
    {
      name: "PSU Wattage vs. CPU+GPU Draw",
      description: "PSU wattage should cover CPU+GPU draw with headroom.",
      source_category_id: psuCategoryId,
      source_field_name: "wattage",
      target_category_id: psuCategoryId,
      target_field_name: "wattage",
      operator: "sum_less_than",
      error_message: "PSU wattage is too low for the selected components",
      config: {
        mode: "sum",
        headroom_percent: 25,
        sum: {
          category_ids: [cpuCategoryId, gpuCategoryId],
          field_name: "tdp_watts",
        },
        target: {
          category_id: psuCategoryId,
          field_name: "wattage",
        },
      },
      priority: 60,
    },
    {
      name: "NVMe Drives vs. M.2 Slots",
      description: "Number of NVMe drives should not exceed motherboard M.2 slots.",
      source_category_id: storageCategoryId,
      source_field_name: "type",
      target_category_id: motherboardCategoryId,
      target_field_name: "m2_slots",
      operator: "sum_less_than",
      error_message: "Not enough M.2 slots for the selected NVMe drives",
      config: {
        mode: "count",
        count: {
          category_ids: [storageCategoryId],
          field_name: "type",
          includes: "NVMe",
        },
        target: {
          category_id: motherboardCategoryId,
          field_name: "m2_slots",
        },
      },
      priority: 50,
    },
  ]

  const rulesToCreate = rulesToSeed.filter((r) => !existingRuleNames.has(r.name))
  if (rulesToCreate.length > 0) {
    await compatibilityModuleService.createCompatibilityRules(rulesToCreate)
    logger.info(`Created ${rulesToCreate.length} compatibility rules.`)
  } else {
    logger.info("Compatibility rules already exist - skipping.")
  }
  logger.info("Finished seeding compatibility rules.")

  const existingPromotionalAds = await promotionsModuleService.listPromotionalAds()
  if (existingPromotionalAds.length === 0) {
    await promotionsModuleService.createPromotionalAds([
      {
        eyebrow: "New arrivals",
        title: "Laptops & gaming gear",
        description: "Fresh hardware, practical prices, and fast local fulfillment.",
        href: "/store",
        placement: "homepage_carousel",
        cta_label: "Shop now",
        priority: 100,
        is_active: true,
      },
      {
        eyebrow: "Build with confidence",
        title: "Every part earns its place",
        description: "Use Coast Tech compatibility checks before you commit to a build.",
        href: "/builder",
        placement: "homepage_carousel",
        cta_label: "Check Compatibility",
        priority: 90,
        is_active: true,
      },
      {
        eyebrow: "Limited-time deals",
        title: "Flash Deals & Clearance",
        description: "Save on selected hardware while stock lasts.",
        href: "/store",
        placement: "homepage_flash_deals",
        cta_label: "Shop deals",
        discount_label: "-15% OFF",
        priority: 100,
        is_active: true,
      },
    ])
    logger.info("Seeded promotional ads.")
  }

  if (existingPromotionalAds.length > 0 && !existingPromotionalAds.some((ad) => ad.placement === "homepage_flash_deals")) {
    await promotionsModuleService.createPromotionalAds([{
      eyebrow: "Limited-time deals",
      title: "Flash Deals & Clearance",
      description: "Save on selected hardware while stock lasts.",
      href: "/store",
      placement: "homepage_flash_deals",
      cta_label: "Shop deals",
      discount_label: "-15% OFF",
      priority: 100,
      is_active: true,
    }])
    logger.info("Seeded homepage flash-deal configuration.")
  }

  // ---------------------------------------------------------------------------
  // Inventory levels (only for the products we just created).
  // ---------------------------------------------------------------------------
  logger.info("Seeding inventory levels.");

  if (productsToCreate.length > 0) {
    const { data: inventoryItems } = await query.graph({
      entity: "inventory_item",
      fields: ["id"],
    });

    if (inventoryItems.length > 0 && stockLocation) {
      // Only create levels for items that don't already have one at this location.
      const { data: existingLevels } = await query.graph({
        entity: "inventory_level",
        fields: ["inventory_item_id"],
        filters: { location_id: stockLocation.id },
      });
      const existingItemIds = new Set(
        existingLevels.map((l) => l.inventory_item_id)
      );

      const itemsToLevel = inventoryItems.filter(
        (item) => !existingItemIds.has(item.id)
      );

      if (itemsToLevel.length > 0) {
        await createInventoryLevelsWorkflow(container).run({
          input: {
            inventory_levels: itemsToLevel.map((item) => ({
              location_id: stockLocation.id,
              stocked_quantity: 50,
              inventory_item_id: item.id,
            })),
          },
        });
        logger.info(
          `Finished seeding inventory levels data. Created ${itemsToLevel.length} levels.`
        );
      } else {
        logger.info("All inventory levels already exist - skipping.");
      }
    } else {
      logger.warn(
        "No stock location available - skipping inventory levels. Run the seed after `medusa db:migrate` on a fresh DB, or set up a stock location first."
      );
    }
  } else {
    logger.info("No new products to seed - skipping inventory levels.");
  }
}
