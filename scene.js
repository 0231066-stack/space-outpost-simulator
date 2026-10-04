// GBA / Pokemon-FireRed style pixel scene, drawn as crisp SVG rectangles.
(function () {
  const P = {
    ground: '#7ec850', groundDark: '#68b23e', groundLight: '#93d861',
    tree: '#2f8f3f', treeLight: '#57c04f', treeDark: '#1f6b2e',
    wall: '#f4f4f4', wallShade: '#cdd5da', roof: '#d64b3a', roofDark: '#a83226',
    window: '#4aa3e0', windowLight: '#9ad8f8',
    grey: '#c9ccd0', greyDark: '#98a0a6', yellow: '#f2cf3f',
    water: '#3aa0e0', waterLight: '#82d2f4',
    flower: '#e0483a', stem: '#3f8f3f',
    panel: '#2a4a8a', panelLight: '#4f7fd0', pole: '#8a8f96',
    sign: '#b98a4a', signFace: '#f4f0dc',
  };

  const W = 240, H = 56;
  const r = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  let s = '';

  // Ground
  s += r(0, 0, W, H, P.ground);

  // Grass speckle texture (deterministic)
  for (let i = 0; i < 120; i++) {
    const x = (i * 37) % W;
    const y = 10 + ((i * 23) % (H - 21));
    s += r(x, y, 2, 1, i % 2 ? P.groundDark : P.groundLight);
  }

  // Hedges (tree canopies) top and bottom
  function hedge(y) {
    for (let x = 0; x < W; x += 8) {
      s += r(x + 1, y, 6, 2, P.treeLight);
      s += r(x, y + 2, 8, 4, P.tree);
      s += r(x + 1, y + 6, 6, 2, P.treeDark);
    }
  }
  hedge(0);
  hedge(H - 8);

  // Tree columns left / right
  for (let y = 8; y < H - 8; y += 8) {
    s += r(0, y, 5, 8, P.tree);
    s += r(W - 5, y, 5, 8, P.tree);
  }

  // Pond
  s += r(58, 31, 26, 9, P.water);
  s += r(60, 30, 22, 2, P.water);
  s += r(60, 40, 22, 2, P.water);
  s += r(62, 33, 8, 2, P.waterLight);
  s += r(74, 37, 6, 1, P.waterLight);

  // Habitat pod (white walls, red roof)
  s += r(24, 8, 30, 5, P.roof);
  s += r(24, 13, 30, 2, P.roofDark);
  s += r(26, 15, 26, 18, P.wall);
  s += r(26, 31, 26, 2, P.wallShade);
  s += r(29, 19, 6, 6, P.window); s += r(29, 19, 6, 1, P.windowLight);
  s += r(41, 19, 6, 6, P.window); s += r(41, 19, 6, 1, P.windowLight);
  s += r(36, 27, 6, 6, P.roofDark);

  // Main outpost building
  s += r(90, 6, 62, 5, P.roof);
  s += r(90, 11, 62, 2, P.roofDark);
  s += r(92, 13, 58, 18, P.grey);
  s += r(92, 13, 58, 2, P.greyDark);
  s += r(96, 17, 12, 8, P.window); s += r(96, 17, 12, 1, P.windowLight);
  s += r(112, 17, 12, 8, P.window); s += r(112, 17, 12, 1, P.windowLight);
  s += r(128, 17, 12, 8, P.window); s += r(128, 17, 12, 1, P.windowLight);
  s += r(92, 28, 58, 3, P.yellow);

  // Solar array
  s += r(174, 30, 2, 10, P.pole);
  s += r(186, 30, 2, 10, P.pole);
  s += r(168, 18, 24, 12, P.panel);
  s += r(168, 18, 24, 1, P.panelLight);
  s += r(168, 23, 24, 1, P.panelLight);
  s += r(168, 28, 24, 1, P.panelLight);
  s += r(178, 18, 1, 12, P.panelLight);
  s += r(184, 18, 1, 12, P.panelLight);

  // Flower garden (two rows of four)
  for (let i = 0; i < 4; i++) {
    const fx = 96 + i * 12;
    s += r(fx, 35, 2, 4, P.stem);
    s += r(fx - 1, 32, 4, 3, P.flower);
    s += r(fx, 42, 2, 4, P.stem);
    s += r(fx - 1, 39, 4, 3, P.flower);
  }

  // Sign
  s += r(152, 38, 2, 8, P.sign);
  s += r(148, 34, 10, 6, P.signFace);
  s += r(149, 35, 8, 1, P.sign);

  // Flag
  s += r(212, 18, 1, 12, P.pole);
  s += r(213, 18, 7, 5, P.flower);

  const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
  const el = document.getElementById('scene');
  if (el) el.innerHTML = svg;
})();
