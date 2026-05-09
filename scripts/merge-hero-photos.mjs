/* eslint-disable */
/**
 * One-off: merge curated `upload.wikimedia.org` hero URLs (with credits +
 * alt text) into `public/trip.json` for all `must`-priority sights. Rewrites
 * `photos[0]` for each listed place id; preserves any existing fallback by
 * defaulting to the picsum.photos seed if absent.
 *
 * Direct `upload.wikimedia.org` URLs ensure the Workbox runtime-caching
 * rule (`^https:\/\/upload\.wikimedia\.org\/.*` → CacheFirst 90d/300)
 * actually applies — `commons.wikimedia.org/wiki/Special:FilePath/...`
 * 302-redirects to upload but the original request URL never matches the
 * cache pattern.
 *
 * Usage: `node scripts/merge-hero-photos.mjs`
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(process.cwd())
const TRIP_PATH = resolve(ROOT, 'public/trip.json')
const SEED_PATH = resolve(ROOT, 'seed-data/malaga-tarifa-2026.json')

/** Agent-curated, verified upload.wikimedia.org hero URLs. */
const heroes = [
  {
    id: 'mlg-alcazaba',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Alcazaba_de_M%C3%A1laga_overview.jpg/1280px-Alcazaba_de_M%C3%A1laga_overview.jpg',
    credit: 'Fernando / Wikimedia Commons / CC-BY-SA-4.0',
    alt: 'Alcazaba of Málaga, Moorish citadel seen in panoramic overview',
  },
  {
    id: 'mlg-gibralfaro',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Castillo_de_Gibralfaro%2C_OCT2015.jpg/1280px-Castillo_de_Gibralfaro%2C_OCT2015.jpg',
    credit: 'Jwh / Wikimedia Commons / CC-BY-SA-3.0-LU',
    alt: 'Castillo de Gibralfaro overlooking Málaga',
  },
  {
    id: 'mlg-catedral',
    src: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Torrecatedralypalmeras.jpg',
    credit: 'mahr / Wikimedia Commons / CC-BY-2.0',
    alt: 'Tower of Málaga Cathedral (La Manquita) framed by palm trees',
  },
  {
    id: 'mlg-picasso',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/MuseoPicassoMalaga.jpg/1280px-MuseoPicassoMalaga.jpg',
    credit: 'Llecco / Wikimedia Commons / CC-BY-SA-3.0',
    alt: 'Courtyard entrance of the Museo Picasso Málaga',
  },
  {
    id: 'mlg-larios',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Calle_Marqu%C3%A9s_de_Larios_M%C3%A1laga.jpg/1280px-Calle_Marqu%C3%A9s_de_Larios_M%C3%A1laga.jpg',
    credit: 'mahr / Wikimedia Commons / CC-BY-2.0',
    alt: 'Calle Marqués de Larios, the main pedestrian shopping street in Málaga',
  },
  {
    id: 'mlg-soho',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/M%C3%A1laga_Soho_graffiti_03.jpg/1280px-M%C3%A1laga_Soho_graffiti_03.jpg',
    credit: 'ESM / Wikimedia Commons / CC-BY-SA-4.0',
    alt: 'Street art mural in the Soho district of Málaga',
  },
  {
    id: 'mlg-tintero',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/El_Palo_Beach.jpg/1280px-El_Palo_Beach.jpg',
    credit: 'Daniel Capilla / Wikimedia Commons / CC-BY-SA-4.0',
    alt: 'El Palo beach in eastern Málaga, the area home to El Tintero restaurant',
  },
  {
    id: 'mlg-recinto-ferial',
    src: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Malaga-feria-Recinto_ferial.jpg',
    credit: 'Lanzi / Wikimedia Commons / CC-BY-SA-3.0',
    alt: 'Recinto Ferial in Málaga during the Feria de Málaga',
  },
  {
    id: 'mlg-atarazanas',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Mercadoatarazana.jpg/1280px-Mercadoatarazana.jpg',
    credit: 'NACLE2 / Wikimedia Commons / CC-BY-3.0',
    alt: 'Mercado Central de Atarazanas, the historic covered market of Málaga',
  },
  {
    id: 'dt-caminito',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Caminito_del_Rey_3.jpg/1280px-Caminito_del_Rey_3.jpg',
    credit: 'Gabirulo / Wikimedia Commons / CC-BY-SA-2.0',
    alt: 'Caminito del Rey walkway clinging to the cliff face of the El Chorro gorge',
  },
  {
    id: 'dt-ronda',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/%22Puente_Nuevo%22_de_Ronda.jpg/1280px-%22Puente_Nuevo%22_de_Ronda.jpg',
    credit: 'Andbog / Wikimedia Commons / CC-BY-SA-4.0',
    alt: 'Puente Nuevo bridge spanning the El Tajo gorge in Ronda',
  },
  {
    id: 'trf-los-lances',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Playa_de_los_Lances_%28Tarifa%29_%283%29.jpg/1280px-Playa_de_los_Lances_%28Tarifa%29_%283%29.jpg',
    credit: 'Olivier Bruchez / Wikimedia Commons / CC-BY-SA-2.0',
    alt: 'Playa de los Lances in Tarifa, with kitesurfers along the broad sandy beach',
  },
  {
    id: 'trf-valdevaqueros',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/YLH-TLE_%28Duna_de_Valdevaqueros%29_-_Flickr_-_Basilievich.jpg/1280px-YLH-TLE_%28Duna_de_Valdevaqueros%29_-_Flickr_-_Basilievich.jpg',
    credit: 'Basilievich / Wikimedia Commons / CC-BY-2.0',
    alt: 'Duna de Valdevaqueros, the great sand dune at Punta Paloma near Tarifa',
  },
  {
    id: 'trf-bolonia',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Beach_of_Bolonia_-_014_-_view.jpg/1280px-Beach_of_Bolonia_-_014_-_view.jpg',
    credit: 'Roland Geider (Ogre) / Wikimedia Commons / Public Domain',
    alt: 'Playa de Bolonia with its dune and turquoise water on the Cádiz coast',
  },
  {
    id: 'trf-castillo',
    src: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Tarifa_castillo.jpg',
    credit: 'Antonio M. Romero Dorado / Wikimedia Commons / Public Domain',
    alt: 'Castillo de Guzmán el Bueno, the medieval castle of Tarifa',
  },
  {
    id: 'trf-punta-tarifa',
    src: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Tarifa_SPOT_1165.jpg',
    credit: 'CNES / Spot Image / Wikimedia Commons / CC-BY-SA-3.0',
    alt: 'Aerial view of Punta de Tarifa and Isla de las Palomas, the southernmost point of mainland Europe',
  },
  {
    id: 'trf-old-town-walk',
    src: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Tarifa_Puerta_de_Jerez2004.jpg',
    credit: 'Wikimedia Commons / CC-BY-SA-3.0',
    alt: 'Puerta de Jerez, the medieval gateway into the old walled town of Tarifa',
  },
  {
    id: 'trf-baelo-claudia',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Bas%C3%ADlica_Baelo_001.jpg/1280px-Bas%C3%ADlica_Baelo_001.jpg',
    credit: 'Anual / Wikimedia Commons / CC-BY-3.0',
    alt: 'Roman ruins of Baelo Claudia near Bolonia, with the basilica in the foreground',
  },
  {
    id: 'trf-whale',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/CZ_Rorcual_FinWhale_Estrecho_Strait_Gibraltar.jpg/1280px-CZ_Rorcual_FinWhale_Estrecho_Strait_Gibraltar.jpg',
    credit: 'Carine Zimmermann / Wikimedia Commons / Public Domain',
    alt: 'Fin whale surfacing in the Strait of Gibraltar off Tarifa',
  },
  {
    id: 'trf-hurricane-rest',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Beach_view_of_Tarifa.jpg/1280px-Beach_view_of_Tarifa.jpg',
    credit: 'Olivier Bruchez / Wikimedia Commons / CC-BY-SA-2.0',
    alt: 'Coastal view of Tarifa beach near the Hurricane Hotel',
  },
  {
    id: 'trf-las-rejas',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Beach_of_Bolonia_-_014_-_view.jpg/1280px-Beach_of_Bolonia_-_014_-_view.jpg',
    credit: 'Roland Geider (Ogre) / Wikimedia Commons / Public Domain',
    alt: 'Bolonia beach where the Las Rejas chiringuito is located',
  },
  {
    id: 'trf-cafe-azul',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/2009_Tarifa_panorama-view_of_the_town.jpg/1280px-2009_Tarifa_panorama-view_of_the_town.jpg',
    credit: 'Łukasz Ciesielski (Guma89) / Wikimedia Commons / CC-BY-SA-4.0',
    alt: 'Panorama of Tarifa old town where Café Azul is located',
  },
]

function applyHeroes(trip) {
  const byId = new Map(heroes.map(h => [h.id, h]))
  let updated = 0
  let missing = []
  for (const place of trip.places) {
    const hero = byId.get(place.id)
    if (!hero) continue
    const fallback
      = place.photos?.[0]?.fallback
      ?? `https://picsum.photos/seed/${place.id}/800/600`
    place.photos = [
      { src: hero.src, alt: hero.alt, credit: hero.credit, fallback },
      ...(place.photos ?? []).slice(1),
    ]
    updated += 1
    byId.delete(place.id)
  }
  for (const id of byId.keys()) missing.push(id)
  return { updated, missing }
}

for (const path of [TRIP_PATH, SEED_PATH]) {
  const json = JSON.parse(readFileSync(path, 'utf8'))
  const result = applyHeroes(json)
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`)
  console.log(`✔ ${path} — updated ${result.updated} places`)
  if (result.missing.length) {
    console.warn(`  ⚠ Not found in trip: ${result.missing.join(', ')}`)
  }
}
