// Soldier types and how each uniform sheet is laid onto the body. Data only, no imports.
// A level spawn names its type (levels/<id>/data.js: `type: 'infantry'`); enemies/rig.js maps the sheet with LAYOUTS.
//
// SOLDIER_TYPES: name -> { sheet (T key, from packtex.js), tint ([r, g, b] multiplier), layout (key of LAYOUTS),
//   weapons (guns this type may carry: 'k98', 'mp40'; [] = none assigned yet) }. The head and helmet are the same for
//   every type (the Infantry sheet's shadowy face, steel helmet).
export const SOLDIER_TYPES = {
  infantry:          { name: 'Infantry',          sheet: 'soldierSheet',          tint: [0.9, 0.98, 0.9], layout: 'infantry',     weapons: ['k98', 'mp40'] },
  panzergrenadier:   { name: 'Panzergrenadier',   sheet: 'sheetPanzergrenadier',  tint: [0.9, 0.9, 0.9],  layout: 'panzergrenadier', weapons: [] },
  ssOfficer:         { name: 'SS Officer',        sheet: 'sheetSSOfficer',        tint: [0.9, 0.9, 0.9],  layout: 'officer',      weapons: [] },
  luftwaffeOfficer:  { name: 'Luftwaffe Officer', sheet: 'sheetLuftwaffeOfficer', tint: [0.9, 0.9, 0.9],  layout: 'luftwaffe',    weapons: [] },
  engineer:          { name: 'Engineer',          sheet: 'sheetEngineer',         tint: [0.9, 0.9, 0.9],  layout: 'engineer',     weapons: [] },
  colonel:           { name: 'Colonel',           sheet: 'sheetColonel',          tint: [0.9, 0.9, 0.9],  layout: 'colonel',      weapons: [] },
};

// LAYOUTS: where each body part's picture is on a sheet, in sheet PIXELS (1024 x 1024; x from the left, y from the TOP).
//   front: tunic front, edges by HIS side: right / left = the block's outer edges, faceRight / faceLeft = the front face's edges
//          (between face edge and outer edge is the side of the torso). top = collar, belt = belt line, hem = bottom edge.
//   back:  tunic back: left / right = his left / right side; top, belt, hem as above (top > hem = drawn upside down).
//   sleeve, hand, thigh, shin: { L, R } strips laid along the limb. along: [start, end] (shoulder -> wrist, wrist -> fingertips,
//          hip -> knee, knee -> sole), around: [a, b] across the strip (round the limb). dir 'h' = along runs left/right on the
//          sheet (x), 'v' = along runs up/down (y). Swap start and end to turn a strip round.
const strip = (dir, along, around) => ({ dir, along, around });
const both = s => ({ L: s, R: s });
export const LAYOUTS = {
  // pack soldier_sheet.png (tex1_256x256_ce1e2eb5faa0f5c0_14)
  infantry: {
    front: { right: 0, faceRight: 120, faceLeft: 490, left: 590, top: 0, belt: 505, hem: 700 },
    back: { left: 590, right: 1015, top: 765, belt: 465, hem: 325 },
    sleeve: { L: strip('h', [470, 845], [165, 305]), R: strip('h', [1015, 700], [8, 158]) },
    hand: { L: strip('h', [845, 1015], [165, 305]), R: strip('h', [700, 485], [8, 158]) },
    thigh: both(strip('v', [515, 755], [600, 1010])),
    shin: both(strip('h', [20, 630], [708, 858])),
  },
  // camouflage smock over field-grey trousers
  panzergrenadier: {
    front: { right: 540, faceRight: 575, faceLeft: 975, left: 1010, top: 482, belt: 818, hem: 1000 },
    back: { left: 0, right: 465, top: 580, belt: 870, hem: 1010 },
    sleeve: { L: strip('h', [540, 1000], [238, 472]), R: strip('h', [1005, 545], [6, 172]) },
    hand: { L: strip('h', [312, 462], [428, 572]), R: strip('h', [158, 4], [402, 572]) },
    thigh: { L: strip('v', [12, 398], [268, 524]), R: strip('v', [12, 395], [12, 292]) },
    shin: { L: strip('v', [428, 545], [168, 305]), R: strip('v', [428, 492], [440, 540]) },
  },
  // SS officer sheet; the Luftwaffe officer uses the same layout (its back collar sits a little higher)
  officer: {
    front: { right: 0, faceRight: 110, faceLeft: 455, left: 520, top: 0, belt: 495, hem: 720 },
    back: { left: 525, right: 1000, top: 360, belt: 612, hem: 800 },
    sleeve: { L: strip('h', [235, 700], [872, 1005]), R: strip('h', [235, 700], [748, 866]) },
    hand: { L: strip('h', [12, 210], [762, 888]), R: strip('h', [12, 210], [890, 1015]) },
    thigh: { L: strip('v', [15, 340], [760, 1015]), R: strip('v', [15, 340], [505, 755]) },
    shin: both(strip('v', [420, 1000], [885, 1015])),
  },
  // blue-grey Luftwaffe officer: shirt collar and tie, same model layout as the SS officer
  luftwaffe: {
    front: { right: 0, faceRight: 110, faceLeft: 455, left: 520, top: 0, belt: 495, hem: 720 },
    back: { left: 525, right: 1000, top: 335, belt: 615, hem: 800 },
    sleeve: { L: strip('h', [235, 700], [872, 1005]), R: strip('h', [235, 700], [748, 866]) },
    hand: { L: strip('h', [12, 210], [762, 888]), R: strip('h', [12, 210], [890, 1015]) },
    thigh: { L: strip('v', [15, 340], [760, 1015]), R: strip('v', [15, 340], [505, 755]) },
    shin: both(strip('v', [420, 1000], [885, 1015])),
  },
  // engineer: light smock (no tunic belt; the trouser belt runs along the top of the sheet)
  engineer: {
    front: { right: 415, faceRight: 450, faceLeft: 990, left: 1015, top: 570, belt: 930, hem: 1010 },
    back: { left: 0, right: 410, top: 565, belt: 930, hem: 1010 },
    sleeve: both(strip('v', [15, 380], [10, 320])),
    hand: { L: strip('h', [182, 358], [382, 518]), R: strip('h', [2, 178], [366, 522]) },
    thigh: { L: strip('v', [80, 400], [700, 1015]), R: strip('v', [80, 400], [342, 690]) },
    shin: { L: strip('v', [400, 555], [700, 1015]), R: strip('v', [400, 555], [365, 690]) },
  },
  // colonel: red collar tabs, silver brocade belt, dark breeches; black leather (gloves and boots) at the left middle
  colonel: {
    front: { right: 495, faceRight: 520, faceLeft: 990, left: 1010, top: 445, belt: 870, hem: 1010 },
    back: { left: 60, right: 460, top: 625, belt: 885, hem: 1010 },
    sleeve: { L: strip('h', [690, 1005], [212, 438]), R: strip('h', [600, 945], [10, 195]) },
    hand: { L: strip('h', [380, 490], [432, 610]), R: strip('h', [55, 230], [432, 610]) },
    thigh: { L: strip('v', [10, 410], [300, 590]), R: strip('v', [10, 410], [10, 300]) },
    shin: { L: strip('v', [425, 615], [360, 490]), R: strip('v', [425, 615], [55, 235]) },
  },
};
