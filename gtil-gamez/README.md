# GTIL Phaser Shooter

**GTIL Phaser Shooter** is an intense, top-down survival shooter built with **Next.js** and **Phaser 3**. Choose your operative, select your battleground, and survive the neon chaos against waves of smart enemies and epic bosses.

![Game Banner](public/assets/player1.png)

## 🎮 Game Overview

You are an elite operative dropped into hostile territory. Your mission is simple: **Eliminate the threat**. 

Survive waves of enemies, scavenge for ammo, utilize tactical cover, and reach **23 Kills** to summon the **Final Boss**. Failure means starting over, but victory immortalizes you in the **High Score Table**.

### ✨ Key Features
- **3 Playable Characters:** Choose your playstyle with **Commando** (Balanced), **Spectre** (Stealth/Speed), or **Titan** (Tank).
- **Procedural & Hand-Crafted Maps:** Fight across 4 unique environments: **Standard**, **Dungeon**, **Terrace**, and **The Bridge**.
- **Dynamic Combat:** Swap between **Pistol**, **Assault Rifle**, and **Shotgun** on the fly.
- **Boss Battles:** Face off against the "Final Boss" with a dedicated health bar and massive minions.
- **Smart AI:** Enemies use A* Pathfinding to hunt you down, hide, and flank.
- **Persistence:** Local High Score system saves your best runs.
- **Polished UI:** Full menu system with Settings, Volume Control, and premium visual effects.

## 🕹️ Controls

| Action | Control | Description |
| :--- | :--- | :--- |
| **Move** | `W`, `A`, `S`, `D` | Navigate the arena |
| **Aim** | Mouse Cursor | Look direction |
| **Shoot** | Left Click | Fire current weapon |
| **Switch Weapon** | `Q` | Cycle Pistol -> Rifle -> Shotgun |
| **Reload** | `R` | Force weapon reload |
| **Interact** | `E` | Open/Close Doors |
| **Dash** | `Space` | Quick burst of speed (Cooldown applies) |

## 👥 Characters

| Class | Color | Description |
| :--- | :--- | :--- |
| **Commando** | Orange | Balanced stats, standard loadout. The classic soldier. |
| **Spectre** | Blue | High speed, sleek visual style. Best for kiting enemies. |
| **Titan** | Red | Imposing presence. Built for holding the line. |

## 🚀 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Sawkker/GTIL.git
    cd GTIL/gtil-gamez
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Play:**
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Tech Stack

- **[Next.js 14](https://nextjs.org/)** - React Framework & Routing
- **[Phaser 3](https://phaser.io/)** - 2D Game Engine (Arcade Physics)
- **[TypeScript](https://www.typescriptlang.org/)** - Type Safety
- **[ZzFX](https://github.com/KilledByAPixel/ZzFX)** - Zuper Zmall Zound Zynth for retro SFX
- **Orbitron & Rajdhani Fonts** - Cyberpunk typography

## 📜 License

This project is open-source. Created by **Facu** & **Antigravity**.
