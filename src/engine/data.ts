import type { LocoKind, SceneKind } from '../art/TrainArt';

export type Rarity = 'C' | 'U' | 'R' | 'SR' | 'UR' | 'SEC';
export type SetId = 'iron' | 'diesel' | 'electric' | 'bullet' | 'maglev';

export interface CardDef {
  id: string;
  set: SetId;
  num: number;
  name: string;
  rarity: Rarity;
  loco: LocoKind;
  scene: SceneKind;
  body: string;
  accent: string;
  sky: [string, string];
  fact: string;
  pop: number;
}

export interface SetDef {
  id: SetId;
  name: string;
  short: string;
  theme: string;
  packPrice: number;
  license: number;
  color: string;
  color2: string;
  emblem: string;
}

export const SETS: SetDef[] = [
  { id: 'iron', name: 'Iron Horses', short: 'IH', theme: 'The golden age of steam', packPrice: 5, license: 0, color: '#c0392b', color2: '#f39c12', emblem: '♨' },
  { id: 'diesel', name: 'Diesel Dynasty', short: 'DD', theme: 'Workhorses of the rails', packPrice: 25, license: 400, color: '#d35400', color2: '#2c3e50', emblem: '⛽' },
  { id: 'electric', name: 'Electric Avenue', short: 'EA', theme: 'Powered by the wire', packPrice: 120, license: 2000, color: '#2980b9', color2: '#f1c40f', emblem: '⚡' },
  { id: 'bullet', name: 'Bullet Dreams', short: 'BD', theme: 'The need for speed', packPrice: 600, license: 10000, color: '#ecf0f1', color2: '#1abc9c', emblem: '➤' },
  { id: 'maglev', name: 'Maglev Futures', short: 'MF', theme: 'Floating into tomorrow', packPrice: 3000, license: 50000, color: '#8e44ad', color2: '#00e5ff', emblem: '◈' },
];

export const SET_BY_ID = Object.fromEntries(SETS.map((s) => [s.id, s])) as Record<SetId, SetDef>;

const SKIES: Record<SceneKind, [string, string][]> = {
  mountains: [['#7fb3e6', '#d7ecff'], ['#f6a96b', '#fde2c4'], ['#89a7d8', '#e7d6f2']],
  snow: [['#a9c6e8', '#eef5ff'], ['#c7b8e0', '#f3eefb']],
  city: [['#88b8e8', '#e3f0fc'], ['#f2a07b', '#f9d8b8'], ['#7d6fa8', '#f3b6a0']],
  night: [['#0b1026', '#2a2d5a'], ['#10142e', '#3d2a5c']],
  hills: [['#8cc6f0', '#e6f6ff'], ['#f7b267', '#fde4b5'], ['#9fd4c4', '#effaf3']],
  forest: [['#8fc4e0', '#dff3ea'], ['#e7a76c', '#f8dfb9']],
  coast: [['#6fb7e9', '#d6f0ff'], ['#f59e7b', '#ffd9b5']],
  desert: [['#f0a35e', '#fde3b0'], ['#e98a6a', '#fbd3a7']],
  space: [['#05010f', '#1b0b3a'], ['#020814', '#0c2a4a']],
};

type Row = [string, Rarity, LocoKind, SceneKind, string, string, string];

const RAW: Record<SetId, Row[]> = {
  iron: [
    ['Puffing Billy', 'C', 'steam', 'hills', '#3d4a3d', '#c9a227', 'Built 1813–14, it is the oldest surviving steam locomotive in the world.'],
    ['Locomotion No. 1', 'C', 'steam', 'hills', '#5b4636', '#d4a64a', 'Hauled the first train on the Stockton & Darlington Railway in 1825.'],
    ['Tom Thumb', 'C', 'tank', 'forest', '#6b3a2a', '#e0b050', 'In 1830 this tiny American engine famously raced a horse-drawn car.'],
    ['John Bull', 'C', 'steam', 'forest', '#2e4a2e', '#e6c35c', 'First run in 1831; it steamed again under its own power in 1981.'],
    ['Best Friend of Charleston', 'C', 'tank', 'coast', '#7a2e2e', '#f2c14e', 'The first locomotive built in the USA for regular passenger service.'],
    ['Pannier Tank', 'C', 'tank', 'hills', '#1f4d2b', '#d8b04a', 'Over 800 of these water-tank shunters were built for the Great Western.'],
    ['Jinty Shunter', 'C', 'tank', 'city', '#1b1b1f', '#c74a3a', 'The LMS "Jinty" 0-6-0 tank shuffled wagons in yards across Britain.'],
    ['Terrier', 'C', 'tank', 'coast', '#a8722a', '#3a2a1a', 'Small but feisty, Terriers built in 1872 still run on heritage lines.'],
    ['Black Five', 'C', 'steam', 'mountains', '#1d1d22', '#c23b22', '842 were built — a true mixed-traffic workhorse of the LMS.'],
    ['Jubilee Class', 'C', 'steam', 'hills', '#7d1f2a', '#e3c16f', 'Named to celebrate King George V\'s Silver Jubilee in 1935.'],
    ['Austerity 2-8-0', 'C', 'steam', 'snow', '#2a2c30', '#9aa0a6', 'Mass-produced in wartime and sent wherever heavy freight needed hauling.'],
    ['Prairie Tank', 'C', 'tank', 'hills', '#244d33', '#e2b950', 'The 2-6-2 wheel layout is nicknamed the "Prairie".'],
    ['Stephenson\'s Rocket', 'U', 'steam', 'hills', '#d9a321', '#2b2b2b', 'Won the 1829 Rainhill Trials and set the template for steam engines.'],
    ['Castle Class', 'U', 'steam', 'coast', '#1f5a2e', '#d8a83c', 'Great Western express engines, famed for speed and polished brass.'],
    ['King Arthur Class', 'U', 'steam', 'forest', '#2f5d3a', '#e6d27a', 'Each was named after a knight of the Round Table.'],
    ['The General', 'U', 'steam', 'forest', '#7a2f1e', '#f0c060', 'Star of the Great Locomotive Chase of 1862.'],
    ['NYC Hudson J-3a', 'U', 'streamsteam', 'city', '#3b4048', '#c0c6cf', 'Its streamlined "Dreyfuss" form became an icon of Art Deco design.'],
    ['City of Truro', 'R', 'steam', 'hills', '#1c4f2c', '#c33', 'Reputedly the first engine to reach 100 mph, in 1904.'],
    ['Duchess of Hamilton', 'R', 'streamsteam', 'mountains', '#7c1c26', '#f1cc6e', 'A streamlined LMS Coronation-class express engine.'],
    ['UP Challenger', 'R', 'bigsteam', 'desert', '#1e1f23', '#e8e2d0', 'An articulated 4-6-6-4 built to race heavy freight over the Rockies.'],
    ['Flying Scotsman', 'SR', 'steam', 'hills', '#1f6b3a', '#f4d35e', 'In 1934 it became the first steam engine officially recorded at 100 mph.'],
    ['Mallard', 'SR', 'streamsteam', 'hills', '#2c5d8a', '#e14b3b', 'Holds the world steam speed record: 126 mph, set on 3 July 1938.'],
    ['Big Boy', 'UR', 'bigsteam', 'desert', '#141518', '#d6d1c4', 'Among the largest steam engines ever built; No. 4014 returned to steam in 2019.'],
    ['Tornado', 'UR', 'steam', 'mountains', '#1f5c8f', '#f2c14e', 'A brand-new Peppercorn A1 completed in 2008 — the first new UK mainline steam engine in 48 years.'],
    ['Jupiter at Promontory', 'SEC', 'steam', 'night', '#8c1f1f', '#ffd23f', 'Met No. 119 nose-to-nose when the Golden Spike was driven in 1869.'],
  ],
  diesel: [
    ['EMD GP9', 'C', 'diesel', 'hills', '#2d3a62', '#f1c40f', 'The "Geep" was one of the most popular road switchers ever built.'],
    ['EMD SW1500', 'C', 'switcher', 'city', '#e2a12b', '#222', 'A yard switcher built to shuffle freight cars all day long.'],
    ['Class 08 Shunter', 'C', 'switcher', 'city', '#2d5b3b', '#f1c40f', 'Britain\'s most numerous locomotive class, with almost 1,000 built.'],
    ['Class 37', 'C', 'diesel', 'mountains', '#1f4e8c', '#f6d23f', 'Nicknamed "Tractors" for their distinctive engine growl.'],
    ['Class 47', 'C', 'diesel', 'hills', '#2a5f3a', '#f2e28a', 'Over 500 built; it hauled everything from mail trains to royal trains.'],
    ['GE U25B', 'C', 'diesel', 'desert', '#7a2222', '#e8e8e8', 'GE\'s "U-boat" marked its entry into the US road diesel market.'],
    ['ALCO RS-3', 'C', 'diesel', 'forest', '#3a3f45', '#c0392b', 'An ALCO road switcher used on lines all over North America.'],
    ['EMD SD40-2', 'C', 'diesel', 'snow', '#1d1f24', '#e67e22', 'Nearly 4,000 built — a legend of North American freight.'],
    ['Class 20', 'C', 'switcher', 'hills', '#2b4f8a', '#e6e6e6', 'Often run in pairs, nose-to-nose, for better visibility.'],
    ['Class 66', 'C', 'diesel', 'city', '#3d2b5a', '#f39c12', 'A modern freight mover that now works across Europe.'],
    ['GE Dash 9-44CW', 'C', 'diesel', 'desert', '#c45a1a', '#1d1d1d', '4,400 horsepower for heavy-haul American freight.'],
    ['Class 31', 'C', 'diesel', 'forest', '#2e6a4a', '#d9d9d9', 'Its original Mirrlees engines earned it the nickname "Toffee Apple".'],
    ['EMD F7 Warbonnet', 'U', 'cabunit', 'desert', '#b8bcc2', '#c0392b', 'The Santa Fe red-and-silver "Warbonnet" livery is one of the most famous ever.'],
    ['EMD E8', 'U', 'cabunit', 'hills', '#3b5e8f', '#e5c35a', 'A sleek passenger diesel from the streamliner era.'],
    ['ALCO PA', 'U', 'cabunit', 'mountains', '#1f3f7a', '#f1c40f', 'Its long nose is often called the most beautiful diesel design.'],
    ['Class 52 Western', 'U', 'diesel', 'coast', '#8a1f2b', '#e8c36a', 'Diesel-hydraulics with names that all began with "Western".'],
    ['Class 50', 'U', 'diesel', 'hills', '#2e4c87', '#e8e8e8', 'Fans called them "Hoovers" because of the sound they made.'],
    ['EMD SD70ACe', 'R', 'diesel', 'mountains', '#f0c419', '#c0392b', 'A modern AC-traction heavy-hauler.'],
    ['Krauss-Maffei ML-4000', 'R', 'diesel', 'mountains', '#7d7f83', '#e74c3c', 'German diesel-hydraulics tested on US railroads in the 1960s.'],
    ['GE AC6000CW', 'R', 'diesel', 'desert', '#e9e9e9', '#2980b9', 'One of the most powerful single-engine diesels ever built.'],
    ['Class 55 Deltic', 'SR', 'cabunit', 'hills', '#2f5c8f', '#f1c40f', 'Its Napier Deltic engines were derived from fast attack boats.'],
    ['DDA40X Centennial', 'SR', 'diesel', 'desert', '#ffd200', '#a5a5a5', 'At 98 feet long, the largest single-unit diesel locomotive ever built.'],
    ['InterCity 125', 'UR', 'hst', 'hills', '#f1c40f', '#1f3a6a', 'The fastest diesel train in service, with a record of 148 mph.'],
    ['Pioneer Zephyr', 'UR', 'cabunit', 'desert', '#cfd5dc', '#555', 'Ran 1,015 miles from Denver to Chicago non-stop in 1934.'],
    ['Blue Pullman', 'SEC', 'hst', 'night', '#2c4f7c', '#f4f4f4', 'A luxury diesel Pullman of 1960, painted in "Nanking Blue".'],
  ],
  electric: [
    ['Class 86', 'C', 'electric', 'hills', '#1d4f91', '#f1f1f1', 'A workhorse of the West Coast Main Line.'],
    ['Class 87', 'C', 'electric', 'mountains', '#3a64a8', '#f0c419', 'Built to haul expresses over Shap and Beattock.'],
    ['Re 4/4 II', 'C', 'electric', 'mountains', '#c0392b', '#ecf0f1', 'Swiss Federal Railways\' most numerous electric loco.'],
    ['PCC Streetcar', 'C', 'tram', 'city', '#2e8b57', '#f5deb3', 'A 1930s streamlined streetcar that is still running today.'],
    ['1938 Tube Stock', 'C', 'tram', 'city', '#b22222', '#eee', 'The classic London Underground train of the mid-century.'],
    ['Class 92', 'C', 'electric', 'coast', '#4a4f57', '#2ecc71', 'Built to haul freight through the Channel Tunnel.'],
    ['Siemens Vectron', 'C', 'electric', 'forest', '#e5e5e5', '#e74c3c', 'A multi-system loco that crosses European borders.'],
    ['Bombardier TRAXX', 'C', 'electric', 'hills', '#2c3e50', '#f39c12', 'More than 2,000 have run across Europe.'],
    ['Melbourne W-Class', 'C', 'tram', 'city', '#2f5e3a', '#e8c36a', 'Melbourne\'s beloved green-and-gold tram.'],
    ['Lisbon Tram 28', 'C', 'tram', 'coast', '#f1c40f', '#c0392b', 'Rattles up Lisbon\'s steepest hills.'],
    ['ACS-64', 'C', 'electric', 'city', '#b8bcc2', '#c0392b', 'Amtrak\'s Northeast Corridor powerhouse.'],
    ['Class 90', 'C', 'electric', 'hills', '#5a2a6a', '#e5e5e5', '110 mph push-pull expresses and night freight.'],
    ['Class 91 InterCity 225', 'U', 'hst', 'hills', '#7a1f2b', '#f1f1f1', 'Reached 162 mph in a 1989 test run.'],
    ['Little Joe', 'U', 'electric', 'mountains', '#e67e22', '#1d1d1d', 'Built for the USSR, these ended up on the Milwaukee Road.'],
    ['New Haven EP-5', 'U', 'electric', 'city', '#1d1d1d', '#e74c3c', 'Nicknamed the "Jets" for their whine.'],
    ['Re 460', 'U', 'electric', 'snow', '#c0392b', '#f1f1f1', 'A Swiss icon of the Gotthard and the Alps.'],
    ['Class 370 APT', 'U', 'roundnose', 'hills', '#e9e9e9', '#c0392b', 'An ambitious tilting train that leaned into the curves.'],
    ['Ae 8/14', 'R', 'crocodile', 'mountains', '#3d6e44', '#e8e8e8', 'A Swiss giant built for the Gotthard line.'],
    ['Virginian EL-2B', 'R', 'electric', 'mountains', '#2c3a52', '#f1c40f', 'Hauled coal in Appalachia with huge power.'],
    ['Wuppertal Schwebebahn', 'R', 'tram', 'city', '#f2f2f2', '#2c7ac9', 'A suspended monorail in service since 1901.'],
    ['PRR GG1', 'SR', 'gg1', 'city', '#2a3b2a', '#d4af37', 'Its art-deco shell was styled by Raymond Loewy.'],
    ['SBB Crocodile', 'SR', 'crocodile', 'snow', '#5a3a1f', '#e8e8e8', 'Its long hoods and rods earned the "Krokodil" nickname.'],
    ['CC 7107', 'UR', 'electric', 'hills', '#1f5f8a', '#bfc7cf', 'Set a world rail speed record of 331 km/h in 1955.'],
    ['BB 9004', 'UR', 'electric', 'coast', '#2a6aa0', '#e5c35a', 'Shared the 1955 record with its sister, CC 7107.'],
    ['Bernina Express', 'SEC', 'tram', 'snow', '#b3121e', '#fff', 'A UNESCO-listed climb across the Alps at 2,253 m.'],
  ],
  bullet: [
    ['100 Series', 'C', 'roundnose', 'city', '#f4f4f4', '#1f4e9a', 'Introduced the first bilevel cars on the Shinkansen.'],
    ['200 Series', 'C', 'roundnose', 'snow', '#f0efe6', '#2a7a3b', 'Built for the snowy Tohoku and Joetsu lines.'],
    ['300 Series', 'C', 'bullet', 'mountains', '#f4f4f4', '#2b5fae', 'Brought 270 km/h "Nozomi" service in 1992.'],
    ['700 Series', 'C', 'bullet', 'coast', '#f7f7f7', '#2457a6', 'Famous for its "duck-bill" nose.'],
    ['E2 Series', 'C', 'bullet', 'hills', '#eeeeee', '#d6336c', 'Climbs the steep line to Nagano.'],
    ['ICE 1', 'C', 'bullet', 'forest', '#f2f2f2', '#d0102a', 'Germany\'s first InterCity Express, from 1991.'],
    ['ICE 2', 'C', 'bullet', 'hills', '#f5f5f5', '#c8102e', 'A half-length ICE that could couple in pairs.'],
    ['Thalys PBKA', 'C', 'bullet', 'city', '#8b1a2b', '#c9c9c9', 'Linked Paris, Brussels, Cologne and Amsterdam.'],
    ['Eurostar e300', 'C', 'bullet', 'coast', '#f1f1f1', '#f2c80f', 'Runs under the English Channel.'],
    ['Class 395 Javelin', 'C', 'bullet', 'city', '#2d3e8a', '#f39c12', 'Ran the 2012 Olympic shuttle in London.'],
    ['Acela Express', 'C', 'bullet', 'city', '#d8dde3', '#2c6fb5', 'America\'s first true high-speed train.'],
    ['KTX-I', 'C', 'bullet', 'mountains', '#ededed', '#30489c', 'Korea\'s first high-speed train, from 2004.'],
    ['E5 Hayabusa', 'U', 'bullet', 'snow', '#2f8f5b', '#e05a8a', 'A 320 km/h bullet with a 15 m long nose.'],
    ['N700S', 'U', 'bullet', 'mountains', '#fafafa', '#1f50a8', 'The newest Tokaido Shinkansen model.'],
    ['ICE 3', 'U', 'bullet', 'forest', '#f7f7f7', '#d0102a', 'Passengers can look out through the driver\'s cab.'],
    ['AVE S-103', 'U', 'bullet', 'desert', '#ececec', '#7a2d8f', 'Spain\'s 350 km/h Velaro.'],
    ['Fuxing CR400AF', 'U', 'bullet', 'city', '#f2f2f2', '#d32f2f', 'Runs at 350 km/h on the world\'s largest high-speed network.'],
    ['500 Series', 'R', 'bullet', 'coast', '#7d8691', '#3b6fb6', 'A sharp-nosed, wing-inspired design for 300 km/h running.'],
    ['TGV Atlantique', 'R', 'bullet', 'hills', '#cfd8e3', '#1d4f91', 'Hit 515.3 km/h in a 1990 record run.'],
    ['Talgo 350 "Pato"', 'R', 'bullet', 'desert', '#f0f0f0', '#6a2a7a', 'Nicknamed "Duck" for its beak.'],
    ['TGV V150', 'SR', 'bullet', 'hills', '#1b2a52', '#bfc7cf', 'Set the world wheeled-rail record of 574.8 km/h in 2007.'],
    ['Frecciarossa 1000', 'SR', 'bullet', 'mountains', '#c8102e', '#bfbfbf', 'Italy\'s "Red Arrow", designed for 360 km/h.'],
    ['0 Series', 'UR', 'roundnose', 'mountains', '#f7f3e6', '#1f4e9a', 'The original bullet train, launched for the 1964 Tokyo Olympics.'],
    ['Doctor Yellow', 'UR', 'roundnose', 'mountains', '#f6d106', '#2a5fae', 'A rarely seen inspection train — it is said to bring good luck.'],
    ['Sakura Night Run', 'SEC', 'bullet', 'night', '#f7c6d9', '#ffffff', 'A legendary cherry-blossom livery run seen only at dusk.'],
  ],
  maglev: [
    ['Birmingham Maglev', 'C', 'urbanmaglev', 'city', '#4a6fa5', '#9fd3ff', 'The world\'s first commercial maglev, opened in 1984.'],
    ['Linimo', 'C', 'urbanmaglev', 'hills', '#e7e7e7', '#2ecc71', 'Built for the 2005 Aichi Expo.'],
    ['Incheon Airport Maglev', 'C', 'urbanmaglev', 'coast', '#f2f2f2', '#1abc9c', 'A driverless airport maglev in Korea.'],
    ['Changsha Maglev', 'C', 'urbanmaglev', 'city', '#e6e6e6', '#e74c3c', 'Connects Changsha\'s airport and its rail station.'],
    ['HSST-100', 'C', 'urbanmaglev', 'hills', '#dedede', '#3498db', 'An early Japanese urban maglev prototype.'],
    ['Transrapid 05', 'C', 'maglev', 'city', '#efefef', '#c0392b', 'Carried visitors at the 1979 Hamburg exhibition.'],
    ['Transrapid 07', 'C', 'maglev', 'forest', '#f5f5f5', '#e67e22', 'Tested at speeds of up to 450 km/h in Emsland.'],
    ['Transrapid 08', 'C', 'maglev', 'forest', '#f0f0f0', '#2980b9', 'A test train on the Emsland track.'],
    ['ML-500', 'C', 'maglev', 'desert', '#e0e0e0', '#8e44ad', 'Hit 517 km/h in 1979 in Miyazaki.'],
    ['MLU002', 'C', 'maglev', 'coast', '#dcdcdc', '#2ecc71', 'A Miyazaki test vehicle from the late 1980s.'],
    ['Beijing S1', 'C', 'urbanmaglev', 'city', '#efefef', '#f39c12', 'A low-speed urban maglev line in Beijing.'],
    ['Daejeon Expo Maglev', 'C', 'urbanmaglev', 'hills', '#e5e5e5', '#16a085', 'Gave rides at Expo \'93 in Korea.'],
    ['Swissmetro', 'U', 'hyperloop', 'mountains', '#d6d6d6', '#e74c3c', 'A plan for underground maglevs in vacuum tubes.'],
    ['M-Bahn', 'U', 'urbanmaglev', 'city', '#f2f2f2', '#f1c40f', 'Ran briefly in Berlin in 1991.'],
    ['ROMAG', 'U', 'urbanmaglev', 'city', '#e8e8e8', '#9b59b6', 'An American monorail-maglev design.'],
    ['Aérotrain', 'U', 'maglev', 'desert', '#f4f4f4', '#e67e22', 'A 1960s French hovertrain that rode on air.'],
    ['Transrapid 09', 'U', 'maglev', 'forest', '#f8f8f8', '#2ecc71', 'The final Transrapid prototype.'],
    ['Shanghai Transrapid', 'R', 'maglev', 'city', '#f1f1f1', '#2196f3', 'Carries passengers at 431 km/h to Pudong airport.'],
    ['MLX01', 'R', 'maglev', 'mountains', '#ececec', '#3f51b5', 'Set a 581 km/h record in 2003.'],
    ['Hyperloop XP-2', 'R', 'hyperloop', 'desert', '#2b2b2b', '#ff5a5f', 'The first hyperloop pod to carry passengers, in 2020.'],
    ['CRRC 600 Maglev', 'SR', 'maglev', 'city', '#f5f5f5', '#00b0ff', 'Designed for 600 km/h.'],
    ['Goddard Vactrain', 'SR', 'hyperloop', 'night', '#7f8c8d', '#ffd166', 'Rocket pioneer Robert Goddard sketched vacuum trains in 1904.'],
    ['L0 Series', 'UR', 'maglev', 'mountains', '#f7f7f7', '#1e63c6', 'Reached 603 km/h in 2015 — the fastest train ever.'],
    ['Lunar Express', 'UR', 'maglev', 'space', '#d9e3f0', '#00e5ff', 'A dream of rail across the Moon\'s Sea of Tranquility.'],
    ['Interstellar Rail', 'SEC', 'hyperloop', 'space', '#1a1a2e', '#ff00e5', 'The last stop is everywhere.'],
  ],
};

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const NUMBERS: Record<SetId, (i: number) => string> = {
  iron: (i) => String(60 + i * 37 % 900),
  diesel: (i) => String(100 + (i * 173) % 8900),
  electric: (i) => String(86000 + i * 211).slice(-5),
  bullet: (i) => `N${700 + i}`,
  maglev: (i) => `MX-${10 + i}`,
};

export const CARDS: CardDef[] = [];
for (const set of SETS) {
  RAW[set.id].forEach((row, i) => {
    const [name, rarity, loco, scene, body, accent, fact] = row;
    const id = `${set.short}-${String(i + 1).padStart(2, '0')}`;
    const h = hash(id + name);
    const skies = SKIES[scene];
    CARDS.push({
      id, set: set.id, num: i + 1, name, rarity, loco, scene, body, accent,
      sky: skies[h % skies.length], fact,
      pop: 0.8 + ((h >>> 8) % 1000) / 1000 * 0.45,
      ...{ number: NUMBERS[set.id](i + 1) },
    } as CardDef);
  });
}

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const CARDS_BY_SET: Record<SetId, CardDef[]> = Object.fromEntries(SETS.map((s) => [s.id, CARDS.filter((c) => c.set === s.id)])) as any;
export const BASE_COUNT = 24;

export function cardNumber(c: CardDef): string { return (c as any).number as string; }
