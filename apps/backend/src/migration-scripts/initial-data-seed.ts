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
  createProductOptionsWorkflow,
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

  // Set to Kenya as per the plan's suggestion
  const countries = ["ke"];

  logger.info("Seeding store data...");
  const {
    result: [defaultSalesChannel],
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
      add: [defaultSalesChannel.id],
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
          default_sales_channel_id: defaultSalesChannel.id,
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
          countries,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
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
  const stockLocation = stockLocationResult[0];

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  // This is created by a migration script in core.
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
      add: [defaultSalesChannel.id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding product category data...");

  // Create hierarchical categories for computer parts
  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        // Top-level categories
        {
          name: "Laptops",
          is_active: true,
          handle: "laptops",
        },
        {
          name: "Desktops / Pre-builts",
          is_active: true,
          handle: "desktops-prebuilts",
        },
        {
          name: "Components",
          is_active: true,
          handle: "components",
        },
        {
          name: "Peripherals",
          is_active: true,
          handle: "peripherals",
        },
        {
          name: "Networking",
          is_active: true,
          handle: "networking",
        },
        {
          name: "Accessories",
          is_active: true,
          handle: "accessories",
        },
        // Subcategories under Components
        {
          name: "Motherboards",
          is_active: true,
          handle: "motherboards",
          parent_category_id: null, // Will be linked after parent creation
        },
        {
          name: "Processors (CPUs)",
          is_active: true,
          handle: "processors-cpus",
        },
        {
          name: "Graphics Cards (GPUs)",
          is_active: true,
          handle: "graphics-cards-gpus",
        },
        {
          name: "Memory (RAM)",
          is_active: true,
          handle: "memory-ram",
        },
        {
          name: "Storage",
          is_active: true,
          handle: "storage",
        },
        {
          name: "Power Supplies (PSUs)",
          is_active: true,
          handle: "power-supplies-psus",
        },
        {
          name: "Cases",
          is_active: true,
          handle: "cases",
        },
        {
          name: "Cooling",
          is_active: true,
          handle: "cooling",
        },
        // Subcategories under Peripherals
        {
          name: "Keyboards",
          is_active: true,
          handle: "keyboards",
        },
        {
          name: "Mice",
          is_active: true,
          handle: "mice",
        },
        {
          name: "Monitors",
          is_active: true,
          handle: "monitors",
        },
        {
          name: "Headsets/Audio",
          is_active: true,
          handle: "headsets-audio",
        },
      ],
    },
  });

  // Now we need to properly set up the hierarchy
  // Note: In a real scenario, you'd fetch the created categories and update parent-child relationships
  // For now, we'll work with flat categories and the hierarchy can be set up via admin

  logger.info("Finished seeding category data.");

  logger.info("Seeding product data...");

  // Create product options for variants where needed
  const { result: productOptionsResult } = await createProductOptionsWorkflow(
    container
  ).run({
    input: {
      product_options: [],
    },
  });

  // Sample CPUs for compatibility testing
  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "AMD Ryzen 7 7800X3D",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Processors (CPUs)")!.id,
          ],
          description:
            "8-core gaming processor with 3D V-Cache technology. AM5 socket, 105W TDP.",
          handle: "amd-ryzen-7-7800x3d",
          weight: 100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://example.com/images/ryzen-7800x3d.png",
            },
          ],
          variants: [
            {
              title: "Default",
              sku: "CPU-AMD-7800X3D",
              prices: [
                {
                  amount: 54999,
                  currency_code: "kes",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
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
          category_ids: [
            categoryResult.find((cat) => cat.name === "Processors (CPUs)")!.id,
          ],
          description:
            "14-core processor (6P+8E) with Intel UHD Graphics 770. LGA1700 socket.",
          handle: "intel-core-i5-14600k",
          weight: 100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://example.com/images/i5-14600k.png",
            },
          ],
          variants: [
            {
              title: "Default",
              sku: "CPU-INT-14600K",
              prices: [
                {
                  amount: 47999,
                  currency_code: "kes",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
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
        // Sample Motherboards
        {
          title: "ASUS ROG STRIX B650-A Gaming WiFi",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Motherboards")!.id,
          ],
          description:
            "AM5 ATX motherboard with WiFi 6E, DDR5 support, PCIe 4.0, 4 RAM slots.",
          handle: "asus-rog-strix-b650-a-gaming-wifi",
          weight: 1500,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://example.com/images/asus-b650-a.png",
            },
          ],
          variants: [
            {
              title: "Default",
              sku: "MB-ASU-B650-A",
              prices: [
                {
                  amount: 32999,
                  currency_code: "kes",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
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
          category_ids: [
            categoryResult.find((cat) => cat.name === "Motherboards")!.id,
          ],
          description:
            "LGA1700 ATX motherboard for Intel 13th/14th gen, DDR5 support, PCIe 5.0.",
          handle: "msi-mag-z790-tomahawk-wifi",
          weight: 1600,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://example.com/images/msi-z790.png",
            },
          ],
          variants: [
            {
              title: "Default",
              sku: "MB-MSI-Z790-TOM",
              prices: [
                {
                  amount: 38999,
                  currency_code: "kes",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
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
        // Sample RAM
        {
          title: "Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Memory (RAM)")!.id,
          ],
          description:
            "High-performance DDR5 memory kit, 6000MHz CL30, optimized for AMD Ryzen 7000 series.",
          handle: "corsair-vengeance-ddr5-32gb-6000mhz",
          weight: 200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://example.com/images/corsair-ddr5.png",
            },
          ],
          variants: [
            {
              title: "Default",
              sku: "RAM-COR-DDR5-32-6000",
              prices: [
                {
                  amount: 18999,
                  currency_code: "kes",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
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
          category_ids: [
            categoryResult.find((cat) => cat.name === "Memory (RAM)")!.id,
          ],
          description:
            "Premium DDR5 memory with RGB lighting, 5600MHz CL36, compatible with Intel and AMD.",
          handle: "gskill-trident-z5-rgb-ddr5-32gb-5600mhz",
          weight: 250,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://example.com/images/gskill-trident.png",
            },
          ],
          variants: [
            {
              title: "Default",
              sku: "RAM-GSK-DDR5-32-5600-RGB",
              prices: [
                {
                  amount: 17499,
                  currency_code: "kes",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
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
        // Sample GPU
        {
          title: "NVIDIA GeForce RTX 4070 Super 12GB",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Graphics Cards (GPUs)")!.id,
          ],
          description:
            "High-performance graphics card with 12GB GDDR6X, ray tracing, DLSS 3.5.",
          handle: "nvidia-rtx-4070-super-12gb",
          weight: 1200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://example.com/images/rtx-4070-super.png",
            },
          ],
          variants: [
            {
              title: "Default",
              sku: "GPU-NV-4070-SUPER",
              prices: [
                {
                  amount: 94999,
                  currency_code: "kes",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
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
        // Sample PSU
        {
          title: "Corsair RM750e 750W 80+ Gold Fully Modular",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Power Supplies (PSUs)")!.id,
          ],
          description:
            "Fully modular 750W power supply with 80+ Gold efficiency, quiet operation.",
          handle: "corsair-rm750e-750w-gold",
          weight: 1800,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://example.com/images/corsair-rm750e.png",
            },
          ],
          variants: [
            {
              title: "Default",
              sku: "PSU-COR-RM750E",
              prices: [
                {
                  amount: 15999,
                  currency_code: "kes",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
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
        // Sample Case
        {
          title: "NZXT H5 Flow White",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Cases")!.id,
          ],
          description:
            "Mid-tower ATX case with excellent airflow, supports ATX/mATX/ITX motherboards.",
          handle: "nzxt-h5-flow-white",
          weight: 6500,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://example.com/images/nzxt-h5-flow.png",
            },
          ],
          variants: [
            {
              title: "Default",
              sku: "CASE-NZXT-H5-WHT",
              prices: [
                {
                  amount: 12999,
                  currency_code: "kes",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
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
        // Sample Storage
        {
          title: "Samsung 990 PRO 2TB NVMe SSD",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Storage")!.id,
          ],
          description:
            "High-speed PCIe 4.0 NVMe M.2 SSD with read speeds up to 7450 MB/s.",
          handle: "samsung-990-pro-2tb-nvme",
          weight: 100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://example.com/images/samsung-990-pro.png",
            },
          ],
          variants: [
            {
              title: "Default",
              sku: "SSD-SAM-990-2TB",
              prices: [
                {
                  amount: 24999,
                  currency_code: "kes",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
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
      ],
    },
  });
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryItems.map((item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 50,
        inventory_item_id: item.id,
      })),
    },
  });

  logger.info("Finished seeding inventory levels data.");
}
