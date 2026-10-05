/**
 * ArMaps — Gaya peta (style) untuk MapLibre, 100% offline.
 *
 * Semua sumber daya (tile + font glyph) berasal dari file lokal:
 *   - tile: PMTiles lokal (dibaca sebagai Blob via FileSource)
 *   - glyph: ./armaps/fonts/{fontstack}/{range}.pbf (dibundel di public/)
 *
 * TIDAK ada URL jaringan di dalam style. Lisensi: © OpenStreetMap (ODbL).
 */

/** Fontstack yang dibundel lokal (lihat public/armaps/fonts/). */
export const FONT_STACK = ['Noto Sans Regular'];

/** Skema warna bergaya terang bersih. */
const C = {
  background: '#f2efe9',
  earth: '#f2efe9',
  water: '#a5c8e1',
  landuse: '#e6ebdc',
  park: '#d9e8cf',
  roadCasing: '#d3cdc3',
  roadFill: '#ffffff',
  roadMajor: '#ffe9a8',
  building: '#e0d8cc',
  buildingOutline: '#cdc4b6',
  boundary: '#b6a9d6',
  text: '#33302b',
  textHalo: '#ffffff',
};

/**
 * Bangun objek style MapLibre untuk sebuah sumber PMTiles.
 * @param {string} sourceKey  kunci PMTiles yang sudah didaftarkan di protokol
 * @param {Object} [opts]
 * @param {boolean} [opts.showLabels=true]
 * @param {string}  [opts.attribution='© OpenStreetMap']
 * @param {string}  [opts.glyphs='./armaps/fonts/{fontstack}/{range}.pbf']
 */
export function buildMapStyle(sourceKey, {
  showLabels = true,
  attribution = '&copy; OpenStreetMap',
  glyphs = './armaps/fonts/{fontstack}/{range}.pbf',
} = {}) {
  const layers = [
    { id: 'background', type: 'background', paint: { 'background-color': C.background } },
    {
      id: 'earth',
      type: 'fill',
      source: sourceKey,
      'source-layer': 'earth',
      paint: { 'fill-color': C.earth },
    },
    {
      id: 'landuse',
      type: 'fill',
      source: sourceKey,
      'source-layer': 'landuse',
      paint: {
        'fill-color': [
          'match', ['get', 'kind'],
          'park', C.park,
          'forest', C.park,
          'grass', C.park,
          'cemetery', C.park,
          C.landuse,
        ],
        'fill-opacity': 0.9,
      },
    },
    {
      id: 'water',
      type: 'fill',
      source: sourceKey,
      'source-layer': 'water',
      paint: { 'fill-color': C.water },
    },
    {
      id: 'buildings',
      type: 'fill',
      source: sourceKey,
      'source-layer': 'buildings',
      minzoom: 13,
      paint: { 'fill-color': C.building, 'fill-outline-color': C.buildingOutline },
    },
    {
      id: 'roads-casing',
      type: 'line',
      source: sourceKey,
      'source-layer': 'roads',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': C.roadCasing,
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 12, 3, 16, 9, 19, 18],
      },
    },
    {
      id: 'roads',
      type: 'line',
      source: sourceKey,
      'source-layer': 'roads',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': [
          'match', ['get', 'kind'],
          ['highway', 'major_road'], C.roadMajor,
          C.roadFill,
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 12, 2, 16, 7, 19, 15],
      },
    },
  ];

  if (showLabels) {
    layers.push(
      {
        id: 'water-label',
        type: 'symbol',
        source: sourceKey,
        'source-layer': 'water',
        minzoom: 12,
        filter: ['has', 'name'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': FONT_STACK,
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 13],
          'text-letter-spacing': 0.05,
        },
        paint: {
          'text-color': '#5b8bb0',
          'text-halo-color': C.textHalo,
          'text-halo-width': 1,
        },
      },
      {
        id: 'places',
        type: 'symbol',
        source: sourceKey,
        'source-layer': 'places',
        filter: ['has', 'name'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': FONT_STACK,
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 10, 12, 14, 15],
          'text-allow-overlap': false,
          'text-padding': 3,
        },
        paint: {
          'text-color': C.text,
          'text-halo-color': C.textHalo,
          'text-halo-width': 1.3,
        },
      },
    );
  }

  return {
    version: 8,
    glyphs,
    sources: {
      [sourceKey]: {
        type: 'vector',
        url: `pmtiles://${sourceKey}`,
        attribution,
      },
    },
    layers,
  };
}
