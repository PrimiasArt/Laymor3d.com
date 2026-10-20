const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'backend', 'repositories', 'MockDatabase.ts');
let content = fs.readFileSync(file, 'utf8');

const imageMap = {
  'mw-101': '/thumbnails/dragon.svg',
  'mw-102': '/thumbnails/gridfinity.svg',
  'mw-103': '/thumbnails/bambu-acc.svg',
  'mw-104': '/thumbnails/hueforge.svg',
  'pr-201': '/thumbnails/rugged-box.svg',
  'mw-105': '/thumbnails/pumpkin.svg',
  'th-301': '/thumbnails/laptop-stand.svg',
  'mw-106': '/thumbnails/bambu-acc.svg',
  'pr-202': '/thumbnails/hsw.svg',
  'mw-107': '/thumbnails/oni-mask.svg',
  'th-302': '/thumbnails/flexi-rex.svg',
  'mw-108': '/thumbnails/spiral-vase.svg',
  'pr-203': '/thumbnails/voron-toolhead.svg',
  'mw-109': '/thumbnails/karambit.svg',
  'th-303': '/thumbnails/c-clamp.svg',
  'mw-110': '/thumbnails/moon-lamp.svg',
  'pr-204': '/thumbnails/bambu-acc.svg',
  'mw-111': '/thumbnails/headphone-hanger.svg',
  'th-304': '/thumbnails/octopus.svg',
  'mw-112': '/thumbnails/airless-ball.svg',
  'pr-205': '/thumbnails/caliper.svg',
  'mw-113': '/thumbnails/snowman.svg',
  'th-305': '/thumbnails/battery-caddy.svg',
};

for (const [id, img] of Object.entries(imageMap)) {
  const reg = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?thumbnailUrl:\\s*')[^']+(')`);
  if (!reg.test(content)) {
    console.warn(`Could not find regex for ${id}`);
  }
  content = content.replace(reg, `$1${img}$2`);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Updated MockDatabase.ts successfully with matching SVG thumbnails!');
