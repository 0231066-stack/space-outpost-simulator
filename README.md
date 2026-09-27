# Space Outpost Simulator

A browser-based educational game where students run a lunar or Martian outpost and balance life support, radiation shielding, power generation, food production, and habitat integrity under real mission trade-offs.

## Features

- Choose a mission: Lunar Base or Mars Outpost
- Manage five core systems with meaningful trade-offs
- Track key resources and mission risks each day
- Experience random events such as solar storms, dust storms, and equipment failures
- Learn through visible cause-and-effect instead of abstract stats
- Win by surviving the mission window while keeping the habitat stable and the crew healthy

## Run locally

Because this is a static web app, you can open `index.html` directly in a browser, or serve the folder locally:

```bash
cd space-outpost-simulator
python3 -m http.server 8000
```

Then open:

http://localhost:8000

## Gameplay loop

Each turn, you choose one major engineering action, then the simulator advances the day and updates the outpost based on how your systems are performing. If your crew runs out of oxygen, food, power, or habitat stability, the mission fails. If you survive the target number of days and keep the base in a healthy range, you win.

## Mission trade-offs the game teaches

- Radiation shielding is valuable but expensive and can reduce available power or habitat space
- Power production must support life support, agriculture, habitat maintenance, and equipment
- Food and water loops are essential, but they require power, crew labor, and infrastructure
- Habitat integrity matters because a damaged base can become unsafe even if supplies remain high
- Real missions are not about "maxing out one system"; they are about balancing several constraints at once
