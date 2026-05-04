/**
 * Seed All Categories
 *
 * Creates 10–20 realistic listings per category so every section
 * of the platform has visible content for new visitors.
 *
 * Usage: npx ts-node scripts/seedAllCategories.ts
 *
 * Re-running is safe — checks for existing seeded listings first.
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Ad from "../models/Ad";

const MONGO_URI = process.env.MONGO_URI || "";
const SEED_TAG = "__seeded_v3__"; // tag in description footer to identify seeded ads

// ─── UK Locations ────────────────────────────────────────
const LOCATIONS = [
  { location: "Central London", outcode: "W1", district: "Westminster", locationSlug: "london" },
  { location: "Shoreditch, London", outcode: "E1", district: "Tower Hamlets", locationSlug: "london" },
  { location: "Camden, London", outcode: "NW1", district: "Camden", locationSlug: "london" },
  { location: "Brixton, London", outcode: "SW9", district: "Lambeth", locationSlug: "london" },
  { location: "Manchester City Centre", outcode: "M1", district: "Manchester", locationSlug: "manchester" },
  { location: "Northern Quarter, Manchester", outcode: "M4", district: "Manchester", locationSlug: "manchester" },
  { location: "Birmingham City Centre", outcode: "B1", district: "Birmingham", locationSlug: "birmingham" },
  { location: "Digbeth, Birmingham", outcode: "B5", district: "Birmingham", locationSlug: "birmingham" },
  { location: "Leeds City Centre", outcode: "LS1", district: "Leeds", locationSlug: "leeds" },
  { location: "Headingley, Leeds", outcode: "LS6", district: "Leeds", locationSlug: "leeds" },
  { location: "Edinburgh New Town", outcode: "EH1", district: "Edinburgh", locationSlug: "edinburgh" },
  { location: "Bristol Harbourside", outcode: "BS1", district: "Bristol", locationSlug: "bristol" },
  { location: "Liverpool City Centre", outcode: "L1", district: "Liverpool", locationSlug: "liverpool" },
  { location: "Glasgow City Centre", outcode: "G1", district: "Glasgow", locationSlug: "glasgow" },
  { location: "Brighton Centre", outcode: "BN1", district: "Brighton", locationSlug: "brighton" },
  { location: "Cardiff Bay", outcode: "CF10", district: "Cardiff", locationSlug: "cardiff" },
  { location: "Nottingham City Centre", outcode: "NG1", district: "Nottingham", locationSlug: "nottingham" },
  { location: "Sheffield City Centre", outcode: "S1", district: "Sheffield", locationSlug: "sheffield" },
  { location: "Bath City Centre", outcode: "BA1", district: "Bath", locationSlug: "bath" },
  { location: "Oxford City Centre", outcode: "OX1", district: "Oxford", locationSlug: "oxford" },
  { location: "Cambridge", outcode: "CB1", district: "Cambridge", locationSlug: "cambridge" },
  { location: "Newcastle City Centre", outcode: "NE1", district: "Newcastle", locationSlug: "newcastle" },
  { location: "Southampton", outcode: "SO14", district: "Southampton", locationSlug: "southampton" },
  { location: "Plymouth", outcode: "PL1", district: "Plymouth", locationSlug: "plymouth" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Category Image Pools (Unsplash CDN) ─────────────────
// Each pool has 20 curated images per category so every listing
// gets 2-4 unique images relevant to that category.
const CATEGORY_IMAGES: Record<string, string[]> = {
  escorts: [
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1521124624117-ab3e43a3c2e4?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1496440737103-cd596325d314?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1464863979621-258859e62245?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1469395446868-fb6a048d5ca3?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1481214110143-ed630356e1bb?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1519742866993-66d3cfef4bbd?w=800&auto=format&q=75",
  ],
  massage: [
    "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1552693673-1bf958298935?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1473091534298-04dcbce3278c?w=800&auto=format&q=75",
  ],
  vehicles: [
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1567818735868-e71b99932e29?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1546614042-7df3c24c9e5d?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1600712242805-5f78671b24da?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1621993202258-45e3a8282c37?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?w=800&auto=format&q=75",
  ],
  property: [
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=800&auto=format&q=75",
  ],
  "buy-sell": [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1558618047-3c47e2a47e74?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1625772452859-1c03d884dcd7?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1555421689-491a97ff2040?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&q=75",
  ],
  jobs: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&q=75",
  ],
  services: [
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1558618047-3c47e2a47e74?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1590935217281-8f102120d683?w=800&auto=format&q=75",
  ],
  community: [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1469571486292-b53601010b89?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1587027831710-d0840fc87baf?w=800&auto=format&q=75",
  ],
  pets: [
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1548767797-d8c844163c4a?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=800&auto=format&q=75",
  ],
  farming: [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1464226184884-fa280b20ef4c?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1592982537447-6f2a6a0c8b93?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1473973916698-71e00c1f7a7e?w=800&auto=format&q=75",
  ],
  electronics: [
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1555421689-491a97ff2040?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=800&auto=format&q=75",
  ],
  furniture: [
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1550254478-ead40cc54513?w=800&auto=format&q=75",
  ],
  fashion: [
    "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&q=75",
  ],
  sports: [
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1526676037777-05a232554f77?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1517344368193-41552b6ad3f5?w=800&auto=format&q=75",
  ],
  entertainment: [
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&auto=format&q=75",
  ],
  dating: [
    "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1536514498073-50e69d39c6cf?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1543342384-1f1350e27861?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1568258537702-27dc7c6be592?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1538679673565-5cb80e84d5dd?w=800&auto=format&q=75",
  ],
  alternative: [
    "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&q=75",
    "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800&auto=format&q=75",
  ],
};

/** Pick `count` unique images from the category pool (cycles if pool is smaller). */
function pickImages(categorySlug: string, count: number): string[] {
  const pool = CATEGORY_IMAGES[categorySlug] || CATEGORY_IMAGES["buy-sell"];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(shuffled[i % shuffled.length]);
  }
  return result;
}



interface ListingTemplate {
  title: string;
  description: string;
  price: number;
  categoryFields?: Record<string, unknown>;
}

interface CategorySeed {
  category: string;
  categorySlug: string;
  listings: ListingTemplate[];
}

const CATEGORY_SEEDS: CategorySeed[] = [
  // ═══════════════════ ESCORTS ═══════════════════
  {
    category: "Escorts",
    categorySlug: "escorts",
    listings: [
      { title: "Elegant Evening Companion — Mayfair", description: "Sophisticated and well-travelled companion for upscale events, dinners, and private encounters. Fluent in English and French. Discreet and attentive.", price: 250 },
      { title: "New to Town — Brazilian Beauty", description: "Just arrived in the UK! Warm, fun-loving and open-minded. I love meeting new people and making every moment memorable. Available for incall and outcall.", price: 180 },
      { title: "Experienced GFE — Chelsea", description: "The ultimate girlfriend experience. Relaxed, affectionate, and genuinely passionate about connecting. No rushing, ever. Available at my luxury apartment.", price: 220 },
      { title: "Petite Asian Beauty — City Centre", description: "Slim, petite and playful. Size 6 with a warm smile and bubbly personality. Perfect for those who appreciate natural beauty and genuine warmth.", price: 160 },
      { title: "Tall Blonde Stunner — Kensington", description: "5'10 natural blonde with model looks and a wicked sense of humour. I love good conversation, fine dining and creating unforgettable memories.", price: 300 },
      { title: "Curvy Caribbean Queen", description: "Voluptuous and confident with curves in all the right places. I bring the sunshine wherever I go. Let me brighten your day.", price: 150 },
      { title: "Mature & Experienced — Discreet Lady", description: "Elegant lady in her 40s offering the real deal. No games, no drama — just genuine chemistry and a relaxing time. Incall available in my private residence.", price: 200 },
      { title: "Eastern European Model — Available Now", description: "Stunning brunette from Eastern Europe. Slim with piercing green eyes. Available for dinner dates, travel companionship and private encounters. 24hr notice preferred.", price: 280 },
      { title: "Mixed Race Goddess — Manchester", description: "British-Jamaican beauty with caramel skin and hazel eyes. Fun-loving, adventurous and always up for trying new things. Your wish is my command.", price: 170 },
      { title: "Italian Beauty — Sophisticated & Fun", description: "Direct from Milan. Elegant and cultured during the day, passionate and adventurous behind closed doors. Available for multi-hour bookings and overnights.", price: 350 },
      { title: "Student by Day, Companion by Night", description: "University student working my way through my degree. Smart, witty and full of energy. I love stimulating conversation as much as physical connection.", price: 140 },
      { title: "Trans Beauty — Pre-Op TS", description: "Beautiful pre-op trans woman with feminine curves and a warm personality. Open-minded and welcoming to all. Safe, clean and discreet.", price: 180 },
      { title: "Duo Available — Best Friends", description: "Two stunning best friends offering an unforgettable duo experience. We're comfortable together and love to play. Doubles the fun, doubles the memories.", price: 400 },
      { title: "Busty Redhead — Natural 34F", description: "All natural redhead with curves that need to be seen to be believed. Warm, friendly and passionate. No implants, no filters — just me.", price: 190 },
      { title: "Luxury Escort — Travelling to You", description: "I specialise in outcall to hotels and residences across the UK. Always immaculately presented and punctual. Long bookings preferred. International travel by arrangement.", price: 500 },
    ],
  },

  // ═══════════════════ MASSAGE & WELLNESS ═══════════════════
  {
    category: "Massage & Wellness",
    categorySlug: "massage",
    listings: [
      { title: "Deep Tissue Massage — Mobile Therapist", description: "Qualified sports massage therapist offering deep tissue treatments at your home or hotel. ITEC Level 4 qualified. Ideal for desk workers, athletes and anyone carrying tension.", price: 65 },
      { title: "Thai Massage — Authentic Training", description: "Traditional Thai massage by a therapist trained in Chiang Mai. Stretching, pressure points and energy work. Floor-based treatment. 60 or 90 minute sessions.", price: 55 },
      { title: "Swedish Relaxation Massage — City Centre", description: "Unwind with a classic Swedish massage in my peaceful treatment room. Soft music, aromatherapy oils and heated bed. Perfect lunchtime escape.", price: 50 },
      { title: "Sports Massage — Pre & Post Event", description: "Specialising in runners, cyclists and gym-goers. Deep tissue work targeting problem areas. Flexible appointments including early mornings and Sundays.", price: 60 },
      { title: "Aromatherapy Massage — Holistic Healing", description: "Bespoke blend of essential oils tailored to your needs. Lavender for stress, eucalyptus for aches, peppermint for energy. A truly sensory experience.", price: 70 },
      { title: "Hot Stone Massage — Luxury Treatment", description: "Heated basalt stones melt away tension and improve circulation. Combined with Swedish techniques for the ultimate relaxation experience. 90 minutes of bliss.", price: 80 },
      { title: "Pregnancy Massage — Gentle & Supportive", description: "Specially trained in prenatal massage. Safe positioning and gentle techniques to ease back pain, swollen ankles and pregnancy discomfort. From 2nd trimester.", price: 55 },
      { title: "Reflexology & Foot Massage — 45 min", description: "Targeted foot reflexology to rebalance your body's systems. Great for insomnia, digestive issues and stress. Includes a soothing foot soak.", price: 40 },
      { title: "Couples Massage — Side by Side", description: "Enjoy a relaxing massage together with your partner. Two therapists, two beds, one beautiful shared experience. Champagne add-on available.", price: 130 },
      { title: "Mobile Massage — We Come to You", description: "Our team of qualified therapists deliver professional massages to your home, office or hotel across the city. All equipment provided. Book same-day.", price: 75 },
      { title: "Indian Head Massage — Quick Recharge", description: "30-minute seated treatment focusing on head, neck and shoulders. No oil needed. Perfect for office workers on their lunch break. Walk-ins welcome.", price: 30 },
      { title: "Lymphatic Drainage Massage", description: "Gentle rhythmic massage to stimulate the lymphatic system. Helps with water retention, post-surgery recovery and detoxification. Trained at the Vodder Academy.", price: 70 },
    ],
  },

  // ═══════════════════ DATING & PERSONALS ═══════════════════
  {
    category: "Dating & Personals",
    categorySlug: "dating",
    listings: [
      { title: "Genuine Guy Seeking Real Connection", description: "38, professional, into hiking, cooking and live music. Looking for a woman who values honest conversation and isn't afraid to be herself. No games.", price: 0 },
      { title: "Looking for Activity Partners — Weekends", description: "New to the area and looking for people to explore with. Into cycling, pub quizzes and trying new restaurants. Open to friendship or more.", price: 0 },
      { title: "Woman Seeking Woman — Over 30s", description: "Professional woman, 34, looking to meet other women for dates. I like theatre, wine bars and country walks. Femme, if labels matter to you.", price: 0 },
      { title: "Divorced Dad Seeking Fresh Start", description: "45, two kids (shared custody), decent sense of humour. Looking for someone patient and kind who doesn't mind a ready-made family. Dog lovers preferred.", price: 0 },
      { title: "Casual Coffee Dates — No Pressure", description: "Let's start with coffee and see where it goes. 29, work in tech, love board games and bad puns. Looking for someone who can keep up.", price: 0 },
      { title: "50+ and Still Adventurous", description: "Retired teacher, 55, recently widowed. Not looking to replace anyone — just want companionship, laughter and someone to share Sunday roasts with.", price: 0 },
      { title: "Fitness Partner & Maybe More", description: "32, gym 5x a week, looking for someone to train with and potentially date. Must enjoy early mornings and protein shakes. Men seeking men.", price: 0 },
      { title: "Countryside Girl in the City", description: "Moved from Devon to Manchester for work. Miss the outdoors. Looking for a like-minded partner who'd rather hike a fell than sit in a nightclub.", price: 0 },
      { title: "Professional Couple Seeking Friends", description: "We're a friendly couple, both 30s, looking to expand our social circle. Open to other couples or singles for dinners, events and weekends away.", price: 0 },
      { title: "Creative Soul Looking for Spark", description: "Artist, 27, slightly chaotic but in a charming way. Looking for someone who appreciates gallery dates, late-night conversations and spontaneous adventures.", price: 0 },
    ],
  },

  // ═══════════════════ JOBS & SERVICES ═══════════════════
  {
    category: "Jobs & Services",
    categorySlug: "jobs",
    listings: [
      { title: "Full-Stack Developer — Remote, £50-70k", description: "Growing fintech startup seeking experienced full-stack developer. React, Node.js, PostgreSQL. Fully remote, flexible hours, equity options. Must be UK-based.", price: 60000 },
      { title: "Barista Wanted — Part Time, Weekends", description: "Independent coffee shop in the city centre. 16-20 hours/week, mainly weekends. Must have latte art skills. £11.50/hr plus tips. Friendly team.", price: 0 },
      { title: "Qualified Electrician — Immediate Start", description: "Busy electrical contractor seeking qualified sparky for residential work. 18th Edition, own transport essential. £200-280/day depending on experience.", price: 240 },
      { title: "Marketing Manager — Charity Sector", description: "National charity seeking Marketing Manager to lead digital campaigns. 3+ years experience. £38-42k. Hybrid working, 3 days office. Pension and 25 days holiday.", price: 40000 },
      { title: "Delivery Driver — Own Van Required", description: "Self-employed delivery driver needed for last-mile parcel delivery. Earn £120-180/day. Flexible schedule, choose your hours. Must have own van and insurance.", price: 0 },
      { title: "Teaching Assistant — Primary School", description: "Friendly primary school seeking a teaching assistant for Year 3. Experience with SEN pupils preferred. Term-time only. £22k pro rata. DBS required.", price: 22000 },
      { title: "Freelance Graphic Designer", description: "Agency looking for reliable freelance designers for ongoing projects. Branding, social media, print. Must be proficient in Adobe Creative Suite. £25-35/hr.", price: 30 },
      { title: "Night Shift Warehouse Operative", description: "Large distribution centre hiring night shift operatives. 10pm-6am, 4 nights per week. £13.50/hr plus night premium. No experience needed — full training.", price: 0 },
      { title: "Receptionist — Dental Practice", description: "Busy dental practice seeks a friendly, organised receptionist. Mon-Fri 8:30-5:30. SOE experience preferred. £24k. Pension and free dental treatment.", price: 24000 },
      { title: "Plumber Needed — Bathroom Refit", description: "Looking for a reliable plumber to fit a new bathroom suite. Remove old bath, fit walk-in shower, new basin and toilet. Please quote with availability.", price: 0 },
      { title: "Junior Web Developer — Graduate Role", description: "Digital agency offering a graduate role in web development. HTML, CSS, JavaScript basics required. On-the-job training with React/Next.js. £25k starting salary.", price: 25000 },
      { title: "Care Worker — Night Shifts Available", description: "Residential care home seeking compassionate care workers. NVQ Level 2 in Health & Social Care preferred. £12.50/hr days, £14/hr nights. DBS check required.", price: 0 },
    ],
  },

  // ═══════════════════ ENTERTAINMENT ═══════════════════
  {
    category: "Entertainment",
    categorySlug: "entertainment",
    listings: [
      { title: "DJ Available — Weddings & Private Events", description: "Professional DJ with 10+ years experience. All genres from 60s to current charts. Full PA system and lighting included. Early booking discount available.", price: 350 },
      { title: "Live Jazz Trio for Hire", description: "Sophisticated jazz trio available for corporate events, weddings and private parties. Standards, bossa nova and modern jazz. 2 or 3 hour sets.", price: 600 },
      { title: "Photographer — Events & Portraits", description: "Freelance photographer covering events, portraits and headshots. Fast turnaround, natural style. From £150 for a 2-hour event or 1-hour portrait session.", price: 150 },
      { title: "Stand-Up Comedian — Corporate & Private", description: "As seen on BBC Three and Comedy Central. Clean or adult material available. Perfect for work parties, stag dos and charity events. 20-45 min sets.", price: 500 },
      { title: "Acoustic Duo — Pubs & Restaurants", description: "Guitar and vocals duo playing laid-back covers. Perfect background music for restaurants, wine bars and garden parties. Covers from Fleetwood Mac to Arctic Monkeys.", price: 250 },
      { title: "Mobile Disco — Kids Parties Specialist", description: "Fun, interactive DJ for children's parties ages 4-12. Games, prizes, bubble machine and LED lights. 2-hour package. Fully DBS checked.", price: 180 },
      { title: "Magician — Close-Up & Stage", description: "Award-winning magician for weddings, corporate events and private parties. Mind-reading, card magic and impossible illusions. Wow your guests!", price: 400 },
      { title: "Videographer — Weddings & Events", description: "Cinematic wedding and event videography. 4K footage, drone shots, same-day edits available. Full day coverage from £800. Highlight reel included.", price: 800 },
      { title: "Salsa Night — Every Friday at The Venue", description: "Come dance salsa every Friday! Beginner lesson at 8pm, social dancing 9pm-midnight. £8 entry, first drink included. No partner needed.", price: 8 },
      { title: "Open Mic Night — Musicians & Poets Welcome", description: "Weekly open mic every Thursday. 10-minute slots for singers, poets, comedians and spoken word. PA provided. Sign up from 7pm, show starts 7:30.", price: 0 },
    ],
  },

  // ═══════════════════ ALTERNATIVE LIFESTYLE ═══════════════════
  {
    category: "Alternative Lifestyle",
    categorySlug: "alternative",
    listings: [
      { title: "Naturist Friendly B&B — Countryside Retreat", description: "Secluded 4-bedroom B&B in rural Somerset. Clothing-optional grounds with heated pool and hot tub. Welcoming to naturist couples and individuals.", price: 95 },
      { title: "Kink-Friendly Social Night — Monthly", description: "Relaxed monthly social for the kink community. No play on premises — just drinks, conversation and meeting like-minded people. Newcomer friendly.", price: 10 },
      { title: "Polyamory Discussion Group", description: "Fortnightly meetup for people in or curious about polyamorous relationships. Supportive, non-judgmental space. Central location. Free, donations welcome.", price: 0 },
      { title: "Fetish Night — Members Only Event", description: "Monthly fetish event at a private venue. Strict dress code: latex, leather, PVC or lingerie. Clean, safe environment with DMs on duty. ID required.", price: 25 },
      { title: "Naturist Swimming — Tuesdays 8-10pm", description: "Weekly naturist swimming at a private pool. Mixed, all ages and bodies welcome. £5 per session. Warm, clean pool with changing facilities.", price: 5 },
      { title: "Swingers Party — Verified Couples Only", description: "Monthly upscale party for verified couples and select singles. Private residence, BYOB. Strict vetting process. Message for details and verification.", price: 40 },
      { title: "LGBTQ+ Support Group — Weekly", description: "Safe space for LGBTQ+ individuals to share experiences and support each other. Led by a trained counsellor. Wednesdays 7pm. Completely confidential.", price: 0 },
      { title: "Rope Bondage Workshop — Beginners", description: "Learn the art of Shibari in a safe, educational environment. All materials provided. Bring a partner or work with a practice dummy. Saturday 2-5pm.", price: 35 },
      { title: "Body Positivity Meetup — All Welcome", description: "Casual monthly gathering celebrating all body types. Activities include life drawing, yoga and open discussion. No judgement, everyone welcome.", price: 0 },
      { title: "Alternative Dating Night — Over 25s", description: "Speed dating event for people into alternative lifestyles. Goth, kink, poly, whatever your identity. Central bar venue, 7:30pm start. Ice breakers included.", price: 15 },
    ],
  },

  // ═══════════════════ BUY & SELL ═══════════════════
  {
    category: "Buy & Sell",
    categorySlug: "buy-sell",
    listings: [
      { title: "iPhone 15 Pro Max 256GB — Mint Condition", description: "Natural Titanium, 256GB. Purchased Jan 2026. Always in case. Battery health 98%. Original box & charger. No scratches.", price: 849 },
      { title: "IKEA Malm Double Bed Frame + Mattress", description: "White IKEA Malm double bed with Sultan mattress. Great condition, 2 years old. Dismantled, ready for collection.", price: 120 },
      { title: "MacBook Pro 14\" M3 Pro — 18GB/512GB", description: "Space Black, barely used. AppleCare+ until 2028. Comes with original box, charger and USB-C hub. Perfect for professionals.", price: 1650 },
      { title: "Dyson V15 Detect — Like New", description: "Used for 3 months then upgraded. All attachments included. Laser head, HEPA filter. Original box. Powerful suction.", price: 380 },
      { title: "PS5 Bundle — 2 Controllers + 5 Games", description: "PS5 disc edition with 2 DualSense controllers and 5 games (Spider-Man 2, FC25, GTA V, God of War, Hogwarts Legacy). All working perfectly.", price: 350 },
      { title: "Vintage Leather Chesterfield Sofa — 3 Seater", description: "Genuine oxblood leather Chesterfield. Some patina consistent with age. Deep button tufting. Heavy item — buyer must arrange collection or delivery.", price: 600 },
      { title: "Mountain Bike — Specialized Rockhopper 29\"", description: "2024 Specialized Rockhopper Comp 29. Shimano Deore groupset. Size Large. Light trail use only. Includes bottle cage and mudguards.", price: 475 },
      { title: "Baby Pram — Silver Cross Wave", description: "Silver Cross Wave tandem pram in Zinc colour. Suitable from birth. Used for one child. Includes rain cover, parasol and cup holder.", price: 420 },
      { title: "Designer Handbag — Gucci Marmont Small", description: "Authentic Gucci GG Marmont small matelassé shoulder bag in dusty pink. Comes with dust bag and authenticity card. Excellent condition.", price: 750 },
      { title: "Electric Guitar — Fender Telecaster MIM", description: "Fender Player Telecaster, Butterscotch Blonde. Mexican made. Maple neck. Great tone, low action. Includes gig bag.", price: 420 },
      { title: "FREE — Moving Sale, Everything Must Go", description: "Clearing out flat before moving abroad. Free: bookshelves, kitchen items, plant pots, curtains, desk lamp. Collection only, this weekend.", price: 0 },
      { title: "Nintendo Switch OLED + Games Bundle", description: "White OLED Switch with Zelda TOTK, Mario Kart 8, Animal Crossing. Includes carry case and screen protector. Barely used.", price: 280 },
      { title: "Gym Equipment — Full Home Gym Setup", description: "Olympic barbell, 100kg weight plates, squat rack, adjustable bench, pull-up bar. Used home gym, great condition. Selling as one lot.", price: 550 },
      { title: "Wedding Dress — Size 10, Never Altered", description: "Beautiful ivory A-line wedding dress with lace detail. Bought for £1,200, wedding called off. Still has tags. Heartbreak not included.", price: 400 },
    ],
  },

  // ═══════════════════ VEHICLES ═══════════════════
  {
    category: "Vehicles",
    categorySlug: "vehicles",
    listings: [
      { title: "2021 VW Golf 1.5 TSI Style — Low Miles", description: "Golf 8, 1.5 TSI 130bhp, manual. 22k miles, full VW service history. Moonstone Grey, LED headlights, adaptive cruise, Apple CarPlay. One owner.", price: 18995 },
      { title: "Yamaha MT-07 2023 — A2 Licence Friendly", description: "Only 3,400 miles. A2 compatible with restrictor kit. Midnight cyan. Akrapovic exhaust, tail tidy. HPI clear.", price: 6295 },
      { title: "Ford Transit Custom 2022 — Panel Van", description: "Ford Transit Custom 300 Limited, 2.0 EcoBlue 130ps. Metallic grey, air con, heated seats, reversing camera. 35k miles. One owner, FSH.", price: 22500 },
      { title: "BMW 3 Series 320i M Sport — 2020", description: "Alpine White, M Sport body kit, 19\" alloys, black leather. 38k miles. Full BMW service history. MOT until November 2026.", price: 24990 },
      { title: "VW Campervan T6.1 — Professional Conversion", description: "2021 T6.1 Highline with professional pop-top conversion. Rock and roll bed, mini kitchen, solar panel, awning. 28k miles.", price: 45000 },
      { title: "Mazda MX-5 RF 2.0 Sport — Soft Top", description: "Soul Red Crystal, 2023 model. 11k miles. Bilstein dampers, Brembo brakes. One of the best driver's cars money can buy.", price: 27500 },
      { title: "Electric Scooter — Vespa Elettrica", description: "Piaggio Vespa Elettrica. Perfect city commuter. 60 mile range, 3-hour charge. Only 800 miles. Like new condition.", price: 4500 },
      { title: "Land Rover Defender 110 — 2022", description: "Defender 110 D250 HSE. Gondwana Stone. Black pack, tow bar, air suspension. 18k miles. Stunning in person.", price: 58000 },
      { title: "Nissan Leaf 40kWh Tekna — 2021", description: "Fully electric, 40kWh battery. 18k miles. ProPilot, around-view camera, leather seats. Home charger included in sale.", price: 16500 },
      { title: "Triumph Bonneville T120 — Chrome Edition", description: "Classic styling, modern reliability. 2023 model with only 2,100 miles. Heated grips, USB charging. Comes with panniers.", price: 9500 },
      { title: "Car Parts — Full Set 18\" BMW Alloys", description: "Genuine BMW 400M style alloys from F30 3 Series. 18x8\" front, 18x8.5\" rear. Good tyres with 5mm+ tread. Minor kerb marks.", price: 450 },
      { title: "2019 Audi A3 Sportback S-Line — Automatic", description: "1.5 TFSI S-Tronic. Nano Grey. Virtual cockpit, LED headlights, 3-zone climate. 42k miles, FASH. Lady owner.", price: 17500 },
    ],
  },

  // ═══════════════════ PROPERTY ═══════════════════
  {
    category: "Property",
    categorySlug: "property",
    listings: [
      { title: "2 Bed Flat to Rent — Canary Wharf, E14", description: "12th floor with Docklands views. Open-plan kitchen/living, two bathrooms. Gym, concierge, underground parking. Available 1st May. 12-month minimum.", price: 2200 },
      { title: "Double Room in Friendly Houseshare", description: "Large double room in clean 4-bed houseshare. All bills included. Near university and high street. Furnished. Available immediately.", price: 550 },
      { title: "3 Bed Semi-Detached — Chain Free", description: "Well-maintained 3-bed semi with rear garden and driveway. New boiler 2024. Close to schools and motorway. Chain free, quick sale wanted.", price: 285000 },
      { title: "Studio Flat — City Centre, Bills Included", description: "Modern studio with kitchenette and en-suite shower. Fully furnished. WiFi and council tax included. Perfect for professionals. No pets.", price: 850 },
      { title: "4 Bed Detached House — Quiet Cul-de-Sac", description: "Spacious family home with conservatory, double garage and south-facing garden. Recently redecorated throughout. EPC rating C.", price: 425000 },
      { title: "Commercial Unit to Let — Ground Floor Retail", description: "A1/A3 use class. 800 sq ft with storage. High footfall location on the high street. Newly refurbished. Available on flexible lease.", price: 1500 },
      { title: "Converted Barn — Rural Retreat, 2 Bed", description: "Stunning barn conversion on a working farm. Exposed beams, log burner, countryside views. 2 beds, 1 bath. 15 min drive from market town.", price: 1100 },
      { title: "Parking Space to Rent — City Centre NCP", description: "Secure underground parking space in city centre. 24/7 access, CCTV. 5 min walk from train station. Monthly rolling contract.", price: 120 },
      { title: "1 Bed Flat for Sale — New Build, Help to Buy", description: "Brand new 1-bed apartment in modern development. Open-plan living, balcony with park views. Help to Buy eligible. 999-year lease.", price: 210000 },
      { title: "Holiday Cottage — Cotswolds, Sleeps 6", description: "Charming stone cottage in a picturesque Cotswolds village. 3 bedrooms, garden, private parking. Dog-friendly. Available for short and long lets.", price: 150 },
      { title: "Shared Office Space — Hot Desking", description: "Bright, modern co-working space. Hot desks from £150/month. Fixed desks from £250. Meeting rooms, kitchen, fast WiFi. Friendly community.", price: 150 },
      { title: "Warehouse Conversion — 1 Bed Loft", description: "Unique 1-bed loft apartment in converted Victorian warehouse. Exposed brick, high ceilings, original features. Open-plan living. Furnished.", price: 1200 },
      { title: "Bedsit to Rent — Single Professional", description: "Self-contained bedsit with shared bathroom. Bills included. Close to bus routes and shops. Suit quiet working professional. No DSS.", price: 450 },
    ],
  },

  // ═══════════════════ PETS & ANIMALS ═══════════════════
  {
    category: "Pets & Animals",
    categorySlug: "pets",
    listings: [
      { title: "KC Registered Golden Retriever Puppies", description: "Litter of 7. Mum and Dad both KC registered with excellent hip scores. Microchipped, first vaccinations, wormed. Ready from 20th April.", price: 1200 },
      { title: "Bengal Kittens — TICA Registered", description: "Stunning spotted Bengals, 2 females and 1 male. Very playful and well socialised. TICA registered, microchipped, neutered. Kitten pack included.", price: 850 },
      { title: "Rescue Lurcher — Loving Home Needed", description: "2-year-old lurcher cross, neutered male. Good with older children and other dogs. Nervous at first but so loving once settled. Adoption fee applies.", price: 150 },
      { title: "Hay & Feed — Horse Supplies Delivered", description: "Quality hay, haylage and hard feed delivered across the county. Bedding also available. Regular delivery rounds. Trade and private welcome.", price: 0 },
      { title: "Cockapoo Puppies — F1, Health Tested", description: "Gorgeous F1 Cockapoo puppies. Mum is KC show cocker, dad is health-tested miniature poodle. Apricot and red colours available. 4 weeks free insurance.", price: 1500 },
      { title: "Tropical Fish — Full Tank Setup", description: "300L aquarium with stand, LED lighting, external filter, heater and decorations. Includes community fish: neons, corydoras, guppies. Running for 2 years.", price: 200 },
      { title: "Dog Walking Service — Insured & DBS Checked", description: "Professional dog walker covering the local area. Group and solo walks available. Fully insured, DBS checked, pet first aid trained. From £12/walk.", price: 12 },
      { title: "Hand-Reared African Grey Parrot", description: "18-month-old hand-reared African Grey. Excellent talker with 50+ words. Comes with large cage, perches and toys. Can demonstrate vocabulary.", price: 1800 },
      { title: "Horse for Loan — 15.2hh Cob Mare", description: "Gentle 15.2hh cobx mare available for full loan. Hacks alone or in company, schooling nicely. Suitable confident novice. Local livery yard.", price: 0 },
      { title: "Pet Sitting — Your Home, Not Kennels", description: "Experienced pet sitter caring for your animals in their own home. Dogs, cats, small animals and birds. CRB checked. Daily updates with photos.", price: 25 },
      { title: "French Bulldog — Blue Fawn, 8 Months", description: "Rehoming my Frenchie due to work changes. Blue fawn, neutered, microchipped, up to date on vaccinations. Comes with all accessories.", price: 800 },
      { title: "Rabbit Hutch & Run — Nearly New", description: "Large two-tier rabbit hutch with attached run. Only 6 months old. Painted, waterproofed. Suit 2 rabbits. Buyer collects.", price: 75 },
    ],
  },

  // ═══════════════════ COMMUNITY ═══════════════════
  {
    category: "Community",
    categorySlug: "community",
    listings: [
      { title: "Volunteer Dog Walkers Needed — RSPCA", description: "The local RSPCA branch needs volunteers to walk rescue dogs on weekday mornings. No experience necessary — full training provided. One morning per week minimum.", price: 0 },
      { title: "Community Litter Pick — Saturday 10am", description: "Monthly community litter pick at Victoria Park. All equipment provided. Families welcome! Refreshments afterwards at the community centre.", price: 0 },
      { title: "Football Team Looking for Players — Sunday League", description: "Friendly Sunday league team needs a goalkeeper and a striker. Training Wednesdays 7pm. Season starts September. All abilities welcome, age 18-45.", price: 0 },
      { title: "Book Club — New Members Welcome", description: "Friendly book club meeting first Tuesday of every month at The Crown pub, 7:30pm. We read a mix of fiction and non-fiction. This month: Klara and the Sun.", price: 0 },
      { title: "Community Garden — Volunteer Days", description: "Help us transform a disused plot into a thriving community garden. Every Sunday 10am-1pm. No gardening experience needed. Tea and biscuits provided!", price: 0 },
      { title: "Parent & Toddler Group — Tuesdays 10am", description: "Free drop-in session for parents and carers with under-5s. Toys, crafts, singing and snacks. Methodist Church Hall. Just turn up!", price: 0 },
      { title: "Running Club — Couch to 5K Programme", description: "Starting a new C25K group for complete beginners. Tuesdays and Thursdays at 6:30pm from the leisure centre. Free, all paces welcome.", price: 0 },
      { title: "Charity Car Wash — Scout Group Fundraiser", description: "Scouts raising money for summer camp. Car wash this Saturday 9am-2pm at Tesco car park. Cars £5, vans £8. Come support the kids!", price: 5 },
      { title: "Lost Cat — Black & White, Answers to Milo", description: "Missing since Monday evening from the Elm Road area. Black and white tuxedo cat, neutered male. Very friendly. Microchipped. Please check sheds and garages.", price: 0 },
      { title: "Allotment Plots Available — Apply Now", description: "The parish council has 3 half-size allotment plots available at the Meadow Lane site. £25/year. Waiting list is short. Water standpipe on site.", price: 25 },
    ],
  },

  // ═══════════════════ SERVICES ═══════════════════
  {
    category: "Services",
    categorySlug: "services",
    listings: [
      { title: "Professional Painter & Decorator — Free Quotes", description: "15 years experience. Interior and exterior. Period properties, wallpapering and feature walls. Fully insured. References available.", price: 0 },
      { title: "Locksmith — 24/7 Emergency Callout", description: "Locked out? Lost keys? We're available around the clock. No call-out fee within 5 miles. UPVC, Yale, mortice locks. CRB checked.", price: 75 },
      { title: "Garden Maintenance — Weekly or One-Off", description: "Lawn mowing, hedge trimming, weeding, jet washing. Regular maintenance or one-off garden clearances. Waste removed. Free estimates.", price: 0 },
      { title: "Mobile Hairdresser — Cuts from £15", description: "Experienced hairdresser offering cuts, colours and blow-dries in your own home. OAP discount Tuesdays. Evening appointments available. City-wide coverage.", price: 15 },
      { title: "Man With a Van — Removals & Deliveries", description: "Reliable man with a large Luton van. House moves, furniture deliveries, tip runs, eBay collections. Competitive rates from £25/hr. Same-day available.", price: 25 },
      { title: "Wedding Photographer — 2026 Dates Available", description: "Natural, documentary-style wedding photography. Full day coverage from £1,200. Engagement shoot included. Online gallery. Second shooter available.", price: 1200 },
      { title: "Accountant — Self Assessment & Small Business", description: "Chartered accountant handling self-assessment tax returns, bookkeeping and company accounts. Fixed fees from £150. Free initial consultation.", price: 150 },
      { title: "Dog Grooming — Mobile Service", description: "Professional dog grooming in a fully equipped van parked on your drive. All breeds, all sizes. Clipping, bathing, nail trimming. From £30.", price: 30 },
      { title: "PC & Laptop Repair — Same Day Service", description: "Virus removal, screen replacement, data recovery, upgrades. No fix, no fee. Home visits or drop-off. 20 years experience. OAP discounts.", price: 0 },
      { title: "Handyman — No Job Too Small", description: "Flat pack assembly, shelf fitting, picture hanging, minor plumbing, door adjustments. Reliable and tidy. £30/hour, minimum 1 hour. Tools provided.", price: 30 },
      { title: "Cleaners Available — Domestic & End of Tenancy", description: "Reliable cleaning team for regular domestic cleaning or deep end-of-tenancy cleans. All products and equipment provided. From £15/hr.", price: 15 },
      { title: "Skip Hire — 4-12 Yard Skips Available", description: "Fast skip delivery across the county. 4, 6, 8 and 12 yard skips. Permit arranged if needed. 14-day hire. Same-day delivery where possible.", price: 180 },
    ],
  },

  // ═══════════════════ DOMESTIC HELP ═══════════════════
  {
    category: "Domestic Help",
    categorySlug: "domestic",
    listings: [
      { title: "Experienced Nanny — Live Out, Mon-Fri", description: "OFSTED registered nanny with 8 years experience. Paediatric first aid trained. Available Mon-Fri at your home. DBS checked. References available.", price: 0 },
      { title: "House Cleaner — 3 Hours Weekly", description: "Reliable, honest cleaner available for weekly domestic cleaning. Own products if required. Ironing included. Local references. £14/hr.", price: 14 },
      { title: "Au Pair Available — Spanish Speaking", description: "23-year-old Spanish au pair seeking host family. Basic English, learning fast. Available from May. Can help with childcare and light housework.", price: 0 },
      { title: "Elderly Companion — Daytime Hours", description: "Caring companion for elderly individuals. Help with shopping, appointments, walks and conversation. DBS checked. £13/hr. Flexible hours.", price: 13 },
      { title: "Babysitter — Evenings & Weekends", description: "Reliable 22-year-old with childcare qualifications. Available Friday and Saturday evenings. Own transport. Enhanced DBS. £12/hr.", price: 12 },
      { title: "Housekeeping — Hotel Standard Cleaning", description: "Professional housekeeper offering hotel-standard domestic cleaning. Bed making, laundry, ironing, organisation. Regular or one-off. From £16/hr.", price: 16 },
      { title: "Dog Sitter — Daytime Care While You Work", description: "Work from home professional offering daytime dog care. Your dog joins my well-socialised pack (max 3 dogs). Secure garden, lots of walks.", price: 20 },
      { title: "Live-In Carer — Experienced & Certified", description: "Qualified health care assistant available for live-in care. Dementia trained, medication management, personal care. NVQ Level 3. Immediate start.", price: 0 },
      { title: "Ironing Service — Collection & Delivery", description: "Hate ironing? I'll collect, iron and return your clothes within 48 hours. From £1 per item. Minimum 10 items. Local area only.", price: 0 },
      { title: "After-School Childcare — 3-6pm", description: "Registered childminder with spaces for after-school care. School pickup, snacks, homework help and free play. OFSTED rated Good. From £5/hr.", price: 5 },
    ],
  },

  // ═══════════════════ CLASSES & LESSONS ═══════════════════
  {
    category: "Classes & Lessons",
    categorySlug: "classes",
    listings: [
      { title: "GCSE Maths Tutor — Guaranteed Grade Improvement", description: "Qualified maths teacher offering 1-to-1 tuition. 10 years in secondary education. Cover all GCSE topics. £35/hr in person, £30 online.", price: 35 },
      { title: "Piano Lessons — Beginner to Grade 8", description: "ABRSM trained teacher with performance experience. Lessons at my studio or your home. All ages from 5+. Theory included. First lesson half price.", price: 30 },
      { title: "Spanish for Beginners — 8-Week Course", description: "Fun evening class, Tuesdays 7-8:30pm. Small groups (max 8). Native teacher. No prior knowledge needed. Materials included.", price: 120 },
      { title: "Driving Lessons — Block Booking Discount", description: "DVSA approved instructor. Manual and automatic. Intensive courses and regular weekly lessons. High pass rate. 10 lessons for £280.", price: 28 },
      { title: "Yoga Classes — Hatha & Vinyasa Flow", description: "Weekly classes at the community hall. Hatha Mondays 6pm, Vinyasa Wednesdays 7pm. All levels welcome. Bring a mat or borrow one. £8 drop-in.", price: 8 },
      { title: "Guitar Lessons — Acoustic & Electric", description: "Learn your favourite songs from day one. Rockschool grades available. Teens and adults. Central studio location. £25/30 mins, £40/hour.", price: 25 },
      { title: "English Language Tutor — IELTS Preparation", description: "Experienced CELTA-qualified teacher. IELTS preparation, general English, business English. Online or face-to-face. £40/hr.", price: 40 },
      { title: "Kids Swimming Lessons — ASA Qualified", description: "Small group swimming lessons for ages 3-10. Heated pool, ASA qualified instructor. Saturdays 9am-12pm. Term: 10 weeks, £60.", price: 60 },
      { title: "Photography Workshop — Beginners DSLR", description: "Full-day workshop covering camera settings, composition and editing basics. Bring your camera. Max 8 students. Lunch included. Central venue.", price: 85 },
      { title: "Boxing Fitness — 1-to-1 Personal Training", description: "Non-contact boxing fitness sessions. Pad work, bag work, conditioning. All fitness levels. Build confidence and get fit. £35/session.", price: 35 },
      { title: "Art Classes — Watercolour for Beginners", description: "Learn watercolour painting in a relaxed studio. 6-week course on Thursday evenings. All materials provided. No experience needed. £90 per course.", price: 90 },
      { title: "First Aid Course — 1 Day Certification", description: "HSE approved 1-day emergency first aid at work course. £60 per person. Group discounts for businesses. Certificate valid 3 years.", price: 60 },
    ],
  },

  // ═══════════════════ HOLIDAYS & TRAVEL ═══════════════════
  {
    category: "Holidays & Travel",
    categorySlug: "holidays",
    listings: [
      { title: "Cornwall Cottage — Sleeps 4, Sea Views", description: "Charming fisherman's cottage 5 minutes from the beach. 2 bedrooms, log burner, enclosed garden. Dog-friendly. Available all year. From £95/night.", price: 95 },
      { title: "Caravan to Hire — Haven, Burnham-on-Sea", description: "3-bedroom static caravan at Haven Burnham-on-Sea. Sleeps 6. Central heating, double glazing, veranda. Pool and entertainment included. From £350/week.", price: 350 },
      { title: "Lake District Lodge — Hot Tub & Fell Views", description: "Luxury 2-bed lodge with private hot tub overlooking Windermere fells. Underfloor heating, log burner. Perfect romantic getaway. Min 3-night stay.", price: 175 },
      { title: "Edinburgh Festival Flat — August Availability", description: "Central 1-bed flat available during Fringe Festival. 2 min walk from Royal Mile. Recently renovated. Sleeps 2. Weekly lets from £800.", price: 800 },
      { title: "Camping Pitch — Family Friendly Campsite", description: "Grass pitches for tents and campervans. Hot showers, electric hook-ups, small shop. Quiet after 10pm. Near coastal path. From £18/night.", price: 18 },
      { title: "Scottish Highlands Retreat — Off-Grid Bothy", description: "Remote bothy near Glencoe. No WiFi, no phone signal — just you and nature. Wood-burning stove, river access. Truly escape the modern world.", price: 65 },
      { title: "City Break — Boutique Hotel, Central London", description: "Designer boutique hotel near Covent Garden. Rooms from £129/night including breakfast. Rooftop bar with Thames views. Book direct for best rate.", price: 129 },
      { title: "Road Trip Partner Wanted — Scotland NC500", description: "Planning the North Coast 500 in July. Looking for 1-2 travel companions to share driving and fuel costs. 7-day trip, camping and B&Bs.", price: 0 },
      { title: "Devon Glamping — Bell Tent with Hot Tub", description: "Luxury bell tent on a small farm. Real bed, wood-fired hot tub, fire pit. Breakfast hamper delivered to your tent. Sleeps 2-4.", price: 120 },
      { title: "Welsh Coast Holiday Home — Pembrokeshire", description: "Detached bungalow sleeping 5, walk to Blue Flag beach. Sea views from the garden. Fully equipped kitchen. Pets welcome. Saturday changeover.", price: 550 },
    ],
  },

  // ═══════════════════ FARMING & AGRICULTURE ═══════════════════
  {
    category: "Farming & Agriculture",
    categorySlug: "farming",
    listings: [
      { title: "John Deere 6120M — 2020, Low Hours", description: "John Deere 6120M with front loader. 2,400 hours. AutoQuad Plus transmission. Air con cab. Good tyres. Serviced by dealer.", price: 52000 },
      { title: "10 Acres Grazing Land to Rent", description: "Good quality permanent pasture. Newly fenced, water trough supplied. Suitable for horses or cattle. 12-month licence. Near M5 junction.", price: 200 },
      { title: "Rare Breed Weaners — Oxford Sandy & Black", description: "Oxford Sandy & Black weaners, 8 weeks old. 4 gilts, 2 boars. From registered pedigree parents. DNA tested. Great for smallholdings.", price: 80 },
      { title: "Round Bale Hay — 2025 Crop", description: "Good quality meadow hay, round bales. Barn stored, no dust. Can deliver within 20 miles. £30 per bale or £25 each for 10+.", price: 30 },
      { title: "Farm Worker Wanted — Dairy, Full-Time", description: "Mixed dairy farm seeking experienced farm worker. Milking, feeding, general farm duties. Tractor experience essential. Accommodation available.", price: 0 },
      { title: "Kubota Compact Tractor — With Mower", description: "Kubota B2530 compact tractor with mid-mount mower deck. 680 hours. 4WD, hydrostatic. Perfect for smallholding or equestrian use.", price: 8500 },
      { title: "Poultry Housing — Chicken Coop for 25 Birds", description: "Commercial-grade chicken house suitable for 25 layers. Nest boxes, perches, pop hole. Pressure treated timber. Buyer dismantles and collects.", price: 350 },
      { title: "Sheep Handling System — IAE", description: "IAE sheep race, drafting gate and holding pen. Good working condition. Some surface rust. Collection from farm near Hereford.", price: 800 },
      { title: "Firewood — Seasoned Hardwood Logs", description: "Kiln-dried hardwood logs, mainly ash and oak. Net bags (£7), bulk bags (£90), trailer loads (£220). Free local delivery on bulk orders.", price: 7 },
      { title: "Agricultural Land for Sale — 35 Acres", description: "35 acres of productive arable land with road frontage. Currently in winter wheat. Planning potential (subject to permission). Guide price £350k.", price: 350000 },
    ],
  },
];

// ─── Seeder ──────────────────────────────────────────────

async function seedAllCategories() {
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI not set");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected.\n");

  // Check for existing seeded listings
  const existingCount = await Ad.countDocuments({ description: { $regex: /__seeded_v[23]__/ } });
  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} previously seeded listings.`);
    console.log("   Deleting old seeds before re-seeding...");
    await Ad.deleteMany({ description: { $regex: /__seeded_v[23]__/ } });
    console.log("   Old seeds removed.\n");
  }

  let totalCreated = 0;

  for (const catSeed of CATEGORY_SEEDS) {
    const docs = catSeed.listings.map((listing) => {
      const loc = pick(LOCATIONS);
      const daysAgo = randBetween(1, 30);
      const isEscort = catSeed.categorySlug === "escorts";

      return {
        title: listing.title,
        description: listing.description + `\n\n${SEED_TAG}`,
        category: catSeed.category,
        categorySlug: catSeed.categorySlug,
        location: loc.location,
        locationSlug: loc.locationSlug,
        outcode: loc.outcode,
        district: loc.district,
        price: listing.price,
        status: "approved",
        moderationStatus: "auto_approved",
        tier: "STANDARD",
        views: randBetween(20, 500),
        clicks: randBetween(5, 80),
        images: pickImages(catSeed.categorySlug, randBetween(2, 4)),
        services: [],
        ...(isEscort ? {} : { selectedServices: [] }),
        isDeleted: false,
        lastPulsedAt: new Date(),
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        ...(isEscort
          ? {
              age: randBetween(21, 45),
              phone: `07${randBetween(400, 999)}${randBetween(100000, 999999)}`,
              profileFields: {
                type: Math.random() > 0.85 ? "Agency" : "Independent",
                incall: Math.random() > 0.2,
                outcall: Math.random() > 0.3,
                languages: pick([
                  ["English"],
                  ["English", "Spanish"],
                  ["English", "French"],
                  ["English", "Romanian"],
                  ["English", "Portuguese"],
                  ["English", "Polish"],
                ]),
                ethnicity: pick(["White British", "White European", "Black British", "Asian", "Mixed Race", "Latin"]),
              },
              pricing: {
                price_30min: randBetween(80, 180),
                price_1hour: listing.price,
                price_2hours: Math.round(listing.price * 1.8),
                price_overnight: Math.round(listing.price * 5),
              },
              selectedServices: pick([
                ["GFE", "OWO", "CIM", "Massage"],
                ["GFE", "French Kissing", "Massage", "Striptease"],
                ["OWO", "CIM", "A-Levels", "Domination"],
                ["GFE", "Couples", "Tantric Massage"],
                ["Massage", "Body Slides", "Shower Together"],
              ]),
            }
          : {
              categoryFields: listing.categoryFields || {},
            }),
      };
    });

    const result = await Ad.insertMany(docs);
    console.log(`  ✅ ${catSeed.category.padEnd(25)} → ${result.length} listings`);
    totalCreated += result.length;
  }

  console.log(`\n🎉 Seeded ${totalCreated} listings across ${CATEGORY_SEEDS.length} categories.`);
  await mongoose.disconnect();
  console.log("🔒 Disconnected.");
}

seedAllCategories().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
