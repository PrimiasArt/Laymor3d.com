import * as THREE from 'three';
import { SampleModelId } from '@/backend/domain/sample-models';

export class ModelBuilder {
  static buildModel(
    id: SampleModelId,
    material: THREE.Material
  ): { group: THREE.Group; height: number } {
    let group: THREE.Group;
    switch (id) {
      case 'benchy':
        group = this.buildBenchy(material);
        break;
      case 'dragon':
        group = this.buildDragon(material);
        break;
      case 'robot':
        group = this.buildRobot(material);
        break;
      case 'gear':
        group = this.buildPlanetaryGear(material);
        break;
      case 'helmet':
        group = this.buildHelmet(material);
        break;
      case 'turbine':
        group = this.buildTurbine(material);
        break;
      case 'eiffel':
        group = this.buildEiffel(material);
        break;
      default:
        group = this.buildBenchy(material);
        break;
    }

    // Auto-calculate exact bounding box and ground model at Y = 0
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Offset all children so that lowest point (box.min.y) is exactly at 0
    const minY = box.min.y;
    group.position.y = -minY;

    return { group, height: size.y };
  }

  /**
   * 1. 3DBenchy - The Iconic 3D Printing Benchmark
   */
  private static buildBenchy(mat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Hull (Thân thuyền với mũi nhọn nâng cao)
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-1.5, 0);
    hullShape.bezierCurveTo(-1.3, -0.6, 0.9, -0.6, 1.7, 0.4);
    hullShape.lineTo(1.4, 0.7);
    hullShape.bezierCurveTo(0.7, 0.5, -0.9, 0.5, -1.5, 0.6);
    hullShape.closePath();

    const hullExtrudeSettings = {
      steps: 2,
      depth: 1.1,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.15,
      bevelSegments: 4,
    };
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, hullExtrudeSettings);
    hullGeo.center();
    const hull = new THREE.Mesh(hullGeo, mat);
    hull.rotation.y = Math.PI / 2;
    hull.position.set(0, 0.4, 0);
    group.add(hull);

    // Deck Surface
    const deckGeo = new THREE.BoxGeometry(0.85, 0.12, 2.5);
    const deck = new THREE.Mesh(deckGeo, mat);
    deck.position.set(0, 0.8, -0.1);
    group.add(deck);

    // Cabin House (Khoang lái có cửa sổ)
    const cabinGeo = new THREE.BoxGeometry(0.75, 0.85, 0.95);
    const cabin = new THREE.Mesh(cabinGeo, mat);
    cabin.position.set(0, 1.3, -0.1);
    group.add(cabin);

    // Curved Cabin Roof (Mái che cong kiểm tra độ võng bridging)
    const roofGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 24, 1, false, 0, Math.PI);
    const roof = new THREE.Mesh(roofGeo, mat);
    roof.rotation.z = Math.PI / 2;
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0, 1.75, -0.1);
    group.add(roof);

    // Smokestack / Chimney (Ống khói tròn)
    const chimneyGeo = new THREE.CylinderGeometry(0.14, 0.17, 0.75, 20);
    const chimney = new THREE.Mesh(chimneyGeo, mat);
    chimney.position.set(0, 1.85, 0.22);
    chimney.rotation.z = -0.06;
    group.add(chimney);

    // Cargo Box (Hộp hàng sau đuôi tàu)
    const cargoGeo = new THREE.BoxGeometry(0.6, 0.35, 0.5);
    const cargo = new THREE.Mesh(cargoGeo, mat);
    cargo.position.set(0, 0.95, -0.85);
    group.add(cargo);

    return group;
  }

  /**
   * 2. Articulated Dragon Segment
   */
  private static buildDragon(mat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Dragon Head with Snout
    const headGeo = new THREE.ConeGeometry(0.55, 1.3, 7);
    const head = new THREE.Mesh(headGeo, mat);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 0.5, 1.3);
    group.add(head);

    // Horns (Sừng nhô)
    const hornGeo = new THREE.ConeGeometry(0.14, 0.85, 6);
    const hornLeft = new THREE.Mesh(hornGeo, mat);
    hornLeft.position.set(-0.35, 1.1, 0.9);
    hornLeft.rotation.z = 0.45;
    hornLeft.rotation.x = -0.3;
    group.add(hornLeft);

    const hornRight = new THREE.Mesh(hornGeo, mat);
    hornRight.position.set(0.35, 1.1, 0.9);
    hornRight.rotation.z = -0.45;
    hornRight.rotation.x = -0.3;
    group.add(hornRight);

    // Segmented Vertebrae Body (Các đốt thân uốn lượn)
    const segmentCount = 6;
    for (let i = 0; i < segmentCount; i++) {
      const radius = 0.42 - i * 0.035;
      const segGeo = new THREE.DodecahedronGeometry(radius);
      const seg = new THREE.Mesh(segGeo, mat);
      const zOffset = 0.6 - i * 0.55;
      const xOffset = Math.sin(i * 0.8) * 0.35;
      seg.position.set(xOffset, 0.4 + Math.cos(i * 0.5) * 0.15, zOffset);
      group.add(seg);

      // Spine Ridges (Vảy gai)
      const spineGeo = new THREE.ConeGeometry(0.1, 0.35, 4);
      const spine = new THREE.Mesh(spineGeo, mat);
      spine.position.set(xOffset, seg.position.y + radius + 0.12, zOffset);
      group.add(spine);
    }

    return group;
  }

  /**
   * 3. Retro Companion Robot
   */
  private static buildRobot(mat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Base Tread Plate (Đế đứng)
    const baseGeo = new THREE.CylinderGeometry(0.9, 1.05, 0.25, 24);
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.set(0, 0.15, 0);
    group.add(base);

    // Torso (Thân robot)
    const torsoGeo = new THREE.BoxGeometry(0.95, 1.0, 0.65);
    const torso = new THREE.Mesh(torsoGeo, mat);
    torso.position.set(0, 0.78, 0);
    group.add(torso);

    // Chest Panel
    const panelGeo = new THREE.BoxGeometry(0.6, 0.45, 0.08);
    const panel = new THREE.Mesh(panelGeo, mat);
    panel.position.set(0, 0.78, 0.35);
    group.add(panel);

    // Head
    const headGeo = new THREE.BoxGeometry(0.8, 0.7, 0.7);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, 1.7, 0);
    group.add(head);

    // Visor Eye Screen
    const visorGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 16);
    const visor = new THREE.Mesh(visorGeo, mat);
    visor.rotation.z = Math.PI / 2;
    visor.position.set(0, 1.72, 0.37);
    group.add(visor);

    // Antennas
    const antGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8);
    const antLeft = new THREE.Mesh(antGeo, mat);
    antLeft.position.set(-0.3, 2.2, 0);
    antLeft.rotation.z = 0.25;
    group.add(antLeft);

    const antRight = new THREE.Mesh(antGeo, mat);
    antRight.position.set(0.3, 2.2, 0);
    antRight.rotation.z = -0.25;
    group.add(antRight);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.75, 12);
    const armLeft = new THREE.Mesh(armGeo, mat);
    armLeft.position.set(-0.65, 0.75, 0);
    armLeft.rotation.z = 0.3;
    group.add(armLeft);

    const armRight = new THREE.Mesh(armGeo, mat);
    armRight.position.set(0.65, 0.75, 0);
    armRight.rotation.z = -0.3;
    group.add(armRight);

    return group;
  }

  /**
   * 4. Planetary Gear Bearing
   */
  private static buildPlanetaryGear(mat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Outer Gear Ring
    const outerRingGeo = new THREE.TorusGeometry(1.3, 0.22, 16, 48);
    const outerRing = new THREE.Mesh(outerRingGeo, mat);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.set(0, 0.25, 0);
    group.add(outerRing);

    // Central Sun Gear
    const sunGearGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.45, 20);
    const sunGear = new THREE.Mesh(sunGearGeo, mat);
    sunGear.position.set(0, 0.25, 0);
    group.add(sunGear);

    // Center Hex Shaft
    const hexGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.5, 6);
    const hexHole = new THREE.Mesh(hexGeo, mat);
    hexHole.position.set(0, 0.25, 0);
    group.add(hexHole);

    // 4 Planet Gears
    const planetCount = 4;
    for (let i = 0; i < planetCount; i++) {
      const angle = (i * Math.PI * 2) / planetCount;
      const x = Math.cos(angle) * 0.85;
      const z = Math.sin(angle) * 0.85;

      const planetGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.45, 16);
      const planet = new THREE.Mesh(planetGeo, mat);
      planet.position.set(x, 0.25, z);
      group.add(planet);

      // Pin
      const pinGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10);
      const pin = new THREE.Mesh(pinGeo, mat);
      pin.position.set(x, 0.25, z);
      group.add(pin);
    }

    return group;
  }

  /**
   * 5. Cyberpunk Mecha Helmet (Nón Giáp Chiến Binh Sci-Fi)
   */
  private static buildHelmet(mat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // A. Cranium Dome (Vòm đầu nón bảo vệ)
    const domeGeo = new THREE.SphereGeometry(1.05, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const dome = new THREE.Mesh(domeGeo, mat);
    dome.position.set(0, 1.25, 0);
    group.add(dome);

    // B. Visor Eye Plate (Mặt nạ kính mắt cong)
    const visorGeo = new THREE.CylinderGeometry(0.95, 0.98, 0.42, 20, 1, false, Math.PI * 0.25, Math.PI * 0.5);
    const visor = new THREE.Mesh(visorGeo, mat);
    visor.rotation.y = Math.PI * 0.25;
    visor.position.set(0, 1.28, 0.25);
    group.add(visor);

    // C. Brow Overhang Crest (Gờ nhô trán)
    const crestGeo = new THREE.BoxGeometry(0.85, 0.12, 0.45);
    const crest = new THREE.Mesh(crestGeo, mat);
    crest.position.set(0, 1.55, 0.72);
    crest.rotation.x = 0.2;
    group.add(crest);

    // D. Chin Respirator Beak (Vòm cằm lọc thở góc cạnh - overhang cần support bên dưới)
    const chinGeo = new THREE.ConeGeometry(0.42, 0.7, 6);
    const chin = new THREE.Mesh(chinGeo, mat);
    chin.rotation.x = Math.PI / 4;
    chin.position.set(0, 0.65, 0.95);
    group.add(chin);

    // E. Left & Right Cheek Armor Plates (Ốp giáp má 2 bên)
    const cheekGeo = new THREE.BoxGeometry(0.35, 0.55, 0.65);
    const cheekL = new THREE.Mesh(cheekGeo, mat);
    cheekL.position.set(-0.85, 0.85, 0.45);
    cheekL.rotation.set(0, 0.25, -0.15);
    group.add(cheekL);

    const cheekR = new THREE.Mesh(cheekGeo, mat);
    cheekR.position.set(0.85, 0.85, 0.45);
    cheekR.rotation.set(0, -0.25, 0.15);
    group.add(cheekR);

    // F. Ear Communication Pucks (Cụm tai nghe tròn 2 bên)
    const earGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16);
    const earL = new THREE.Mesh(earGeo, mat);
    earL.rotation.z = Math.PI / 2;
    earL.position.set(-1.12, 1.25, 0);
    group.add(earL);

    const earR = new THREE.Mesh(earGeo, mat);
    earR.rotation.z = Math.PI / 2;
    earR.position.set(1.12, 1.25, 0);
    group.add(earR);

    // G. Neck Flange (Vành cổ nón)
    const neckGeo = new THREE.TorusGeometry(0.85, 0.12, 12, 28);
    const neck = new THREE.Mesh(neckGeo, mat);
    neck.rotation.x = Math.PI / 2;
    neck.position.set(0, 0.35, -0.05);
    group.add(neck);

    return group;
  }

  /**
   * 6. Jet Engine Turbofan & Nacelle (Động Cơ Phản Lực Cánh Quạt)
   */
  private static buildTurbine(mat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // A. Outer Nacelle Cowling (Vỏ ống động cơ hình trụ rỗng)
    const nacelleGeo = new THREE.CylinderGeometry(1.2, 1.15, 1.3, 32, 1, true);
    const nacelle = new THREE.Mesh(nacelleGeo, mat);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(0, 1.35, 0);
    group.add(nacelle);

    // B. Aerodynamic Front Intake Lip (Vành mép miệng hút gió tròn bo tròn)
    const lipGeo = new THREE.TorusGeometry(1.2, 0.08, 16, 36);
    const lip = new THREE.Mesh(lipGeo, mat);
    lip.position.set(0, 1.35, 0.65);
    group.add(lip);

    // C. Central Aerodynamic Spinner Nose Cone (Chóp nón rẽ gió)
    const coneGeo = new THREE.ConeGeometry(0.38, 0.85, 20);
    const cone = new THREE.Mesh(coneGeo, mat);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, 1.35, 0.55);
    group.add(cone);

    // D. Central Hub Shaft (Trục quay trung tâm)
    const shaftGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.1, 18);
    const shaft = new THREE.Mesh(shaftGeo, mat);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 1.35, -0.05);
    group.add(shaft);

    // E. 8 Curved Compressor Fan Blades (8 cánh quạt nén khí nghiêng góc 32 độ)
    const bladeCount = 8;
    for (let i = 0; i < bladeCount; i++) {
      const angle = (i * Math.PI * 2) / bladeCount;
      const bladeGeo = new THREE.BoxGeometry(0.12, 0.85, 0.05);
      const blade = new THREE.Mesh(bladeGeo, mat);
      blade.position.set(Math.cos(angle) * 0.72, 1.35 + Math.sin(angle) * 0.72, 0.25);
      blade.rotation.z = angle + 0.35;
      blade.rotation.x = 0.55;
      group.add(blade);
    }

    // F. Engine Support Pylon & Stand (Giá đỡ động cơ kiên cố gắn bàn in)
    const pylonGeo = new THREE.BoxGeometry(0.25, 0.85, 0.8);
    const pylon = new THREE.Mesh(pylonGeo, mat);
    pylon.position.set(0, 0.45, 0);
    group.add(pylon);

    const baseGeo = new THREE.BoxGeometry(1.5, 0.12, 1.3);
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.set(0, 0.06, 0);
    group.add(base);

    return group;
  }

  /**
   * 7. Paris Eiffel Tower Miniature (Tháp Eiffel Kiến Trúc)
   */
  private static buildEiffel(mat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // A. 4 Arching Foundation Legs (4 chân trụ tháp nghiêng vào tâm)
    const legGeo = new THREE.BoxGeometry(0.24, 1.1, 0.24);
    const legPositions = [
      { x: -0.7, z: -0.7, rx: 0.25, rz: -0.25 },
      { x: 0.7, z: -0.7, rx: 0.25, rz: 0.25 },
      { x: -0.7, z: 0.7, rx: -0.25, rz: -0.25 },
      { x: 0.7, z: 0.7, rx: -0.25, rz: 0.25 },
    ];
    legPositions.forEach((lp) => {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lp.x, 0.5, lp.z);
      leg.rotation.set(lp.rx, 0, lp.rz);
      group.add(leg);
    });

    // B. 1st Floor Observation Deck (Sàn quan sát tầng 1)
    const deck1Geo = new THREE.BoxGeometry(1.45, 0.08, 1.45);
    const deck1 = new THREE.Mesh(deck1Geo, mat);
    deck1.position.set(0, 0.95, 0);
    group.add(deck1);

    // C. 4 Grand Arches beneath 1st Floor (4 vòm cung La Mã nâng đỡ sàn tầng 1)
    const archGeo = new THREE.TorusGeometry(0.55, 0.08, 12, 24, Math.PI);
    const archNorth = new THREE.Mesh(archGeo, mat);
    archNorth.position.set(0, 0.65, 0.58);
    group.add(archNorth);

    const archSouth = new THREE.Mesh(archGeo, mat);
    archSouth.position.set(0, 0.65, -0.58);
    group.add(archSouth);

    const archEast = new THREE.Mesh(archGeo, mat);
    archEast.rotation.y = Math.PI / 2;
    archEast.position.set(0.58, 0.65, 0);
    group.add(archEast);

    const archWest = new THREE.Mesh(archGeo, mat);
    archWest.rotation.y = Math.PI / 2;
    archWest.position.set(-0.58, 0.65, 0);
    group.add(archWest);

    // D. 2nd Floor Mid Lattice Tower (Khối tháp thu hẹp lên tầng 2)
    const midGeo = new THREE.CylinderGeometry(0.38, 0.62, 0.85, 4);
    const midTower = new THREE.Mesh(midGeo, mat);
    midTower.rotation.y = Math.PI / 4;
    midTower.position.set(0, 1.42, 0);
    group.add(midTower);

    // E. 2nd Floor Platform Deck (Sàn tầng 2)
    const deck2Geo = new THREE.BoxGeometry(0.85, 0.06, 0.85);
    const deck2 = new THREE.Mesh(deck2Geo, mat);
    deck2.position.set(0, 1.85, 0);
    group.add(deck2);

    // F. Upper Spire Pyramid & Antenna Needle (Chóp tháp và kim thu lôi)
    const spireGeo = new THREE.ConeGeometry(0.26, 0.95, 4);
    const spire = new THREE.Mesh(spireGeo, mat);
    spire.rotation.y = Math.PI / 4;
    spire.position.set(0, 2.35, 0);
    group.add(spire);

    const needleGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.45, 8);
    const needle = new THREE.Mesh(needleGeo, mat);
    needle.position.set(0, 2.9, 0);
    group.add(needle);

    return group;
  }
}
