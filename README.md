![](https://i.ibb.co.com/S4HV9GGV/2fd9d1cd6804.jpg)

# WhatsApp Bot - YuziMD

WhatsApp bot berbasis Baileys Multi-Device dengan sistem modular, ringan, dan mudah dikembangkan.

---

## Overview

Project ini dibuat untuk automation WhatsApp dengan sistem plugin agar fitur bisa ditambah tanpa mengubah core utama.

---

## Preview

### Chat Preview
![Preview 1](https://i.ibb.co.com/W9NsVVT/IMG-20260529-070418.jpg)

---

## Features

- Multi-Device WhatsApp (Baileys)
- Plugin-based command system
- Auto reconnect session
- Event-driven architecture
- Simple command handler
- Lightweight and fast
- Easy to scale

---

## Tech Stack

![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=white)

---

## Installation

### Clone Repository
```bash
git clone https://github.com/yellow-env/bot-wa.git
cd bot-wa
````

### Install Dependencies

```bash
npm install
```

---

## Configuration

Contoh config:

```js
export default {
  owner: "Yellow Hoshino", // set nama owner
  ownerNum: ["6285198221676", "62xxxxxx"], // Nomer yang pertama( index 0 ) adalah owner, sedangkan yang lainnya adalah co-owner

  botName: "Yuzi Bot", // ubah nama bot
  prefix: ".", // set prefix
  botVersion: packageFile.version,

  sessionName: "yuzi_session",
  baileys: "@whiskeysockets/baileys",

  // Ubah Gambar disini 
  thumb: "https://i.ibb.co.com/DDQ1vq2v/014a1dd5-a38e-426d-bb8e-6ce949d57bc3.jpg",
  
  // Persona AI ( ga diubah juga gpp )
  aiGender: "female",
  aiAge: "18",
  aiPersonality: ["cheerfully", "teasing", "cute", "kind", "mysterious"],
  aiChatGenre: ["romance", "slice of life"],
};
```

---

## Running Bot

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

---

## Project Structure

```bash
bot-wa/
├── lib/
│   ├── plugins/
│   ├── canvas/
│   ├── handlers/
│   ├── utils/
│   └── scrape/
├── assets/
├── tmp/
├── logs/
├── config/
├── yuzi_session/
├── yuzi.js
├── connector.js
├── package.json
└── README.md
```

---

## Creating a New Command

```js
export default {
  name: "ping",
  command: ["ping"],
  category: "general",
  async run(yuzi, msg, { jid, args, isOwner, isBotAdmin, isAdmin }) {
    await yuzi.sendMessage(msg.chat, { text: "pong" })
  }
}
```

---

## Notes

* Gunakan secara bijak
* Hindari spam
* Gunakan sesuai kebutuhan

---

## Credits

![Baileys](https://img.shields.io/badge/Baileys-000000?logo=whatsapp&logoColor=white)
Baileys by WhiskeySockets

![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
Node.js Community

---

## Contributors

<a href="https://github.com/yellow-env">
  <img src="https://github.com/yellow-env.png" width="80" height="80" style="border-radius:50%;" />
</a>

**yellow-env**
