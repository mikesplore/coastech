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
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

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
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  );

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
            payment_providers: ["pp_system_default"],
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
  ];

  const productsToCreate = products.filter((p) => !productHandles.has(p.handle));

  if (productsToCreate.length > 0) {
    await createProductsWorkflow(container).run({
      input: {
        products: productsToCreate.map((p) => ({
          title: p.title,
          options: [
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
          variants: [
            {
              title: "Default",
              sku: p.sku,
              options: {
                Default: "Default",
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
          metadata: p.metadata,
        })),
      },
    });
  }
  logger.info(
    `Finished seeding product data. Created ${productsToCreate.length} products.`
  );

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