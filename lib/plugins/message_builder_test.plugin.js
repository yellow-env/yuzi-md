import {
  VERSION,
  Button,
  ButtonV2,
  Carousel,
  AIRich,
} from "../utils/MessageBuilderV4.4.js";

export default {
  name: "Message Builder Test",
  category: ["owner"],
  command: ["messagebuildertest", "mbt"],
  owner_only: true,
  async run(yuzi, msg, { jid }) {
    await new Button(yuzi)
      .setTitle("🚀 NIXCODE")
      .setSubtitle("Interactive Message")
      .setBody("Pilih menu di bawah")
      .setFooter("© Nixel")
      .setImage(
        "https://cdn.ornzora.eu.cc/b57c0d1e-d7a6-4277-8739-8f6b1d9894e6-FIORA.jpg",
      )
      .addReply("📦 Menu", ".menu", { icon: "DEFAULT" }) //change icon
      .addReply("👤 Profile", ".profile")
      .addUrl("🌐 Website", "https://example.com", true)
      .addCopy("📋 Copy Code", "NIX-2026")
      .addSelection("📚 Pilih Kategori")
      .makeSection("Main Menu") //now .makeSection instead .makeSections
      .makeRow("🔥 HOT", "Downloader", "Download social media", ".dl")
      .makeRow("⚡ FAST", "AI Chat", "Chat dengan AI", ".ai")
      .send(jid);

    await new ButtonV2(yuzi)
      .setTitle("🚀 NIXCODE")
      .setSubtitle("Buttons Message")
      .setBody("Halo dunia")
      .setFooter("Footer Message")
      .setThumbnail(
        "https://cdn.ornzora.eu.cc/4d2905ce-3707-4ec0-998a-68a3d851629f-FIORA.jpg",
      )
      .addButton("📦 Menu", ".menu")
      .addButton("👤 Profile", ".profile")
      .send(jid);

    await new Carousel(yuzi)
      .setBody("🛍️ Product List")
      .setFooter("Swipe untuk lihat")
      .addCard(
        await new Button(yuzi)
          .setTitle("🍔 Burger")
          .setBody("Burger terenak")
          .setFooter("$5")
          .setImage(
            "https://cdn.ornzora.eu.cc/36df8c36-c74e-4dc2-bc03-87893f373cb4-FIORA.jpg",
          )
          .addReply("🛒 Buy", ".buy burger")
          .toCard(),
      )
      .addCard(
        await new Button(yuzi)
          .setTitle("🍕 Pizza")
          .setBody("Pizza mozzarella")
          .setFooter("$7")
          .setImage(
            "https://cdn.ornzora.eu.cc/36df8c36-c74e-4dc2-bc03-87893f373cb4-FIORA.jpg",
          )
          .addReply("🛒 Buy", ".buy pizza")
          .toCard(),
      )
      .send(jid);

    await new AIRich(yuzi)
      .setTitle("🚀 NIXCODE")
      .addText(
        `
# Halo Dunia
## NIXCODE

---

=={ Yellow Text }==

---

Ini hyperlink:
[Text] (url) 
[Google](https://google.com)

Ini auto citation:
[] (url) 
[](https://openai.com)

Ini LaTeX:
[Identifier|?Width|?Height|?Font_Height|?Padding] <url>
[Shiroko|1429|1897]<https://cdn.ornzora.eu.cc/a3a756f2-6bb8-4814-a024-c325524a2308-FIORA.png>
	`,
      )
      .addCode(
        "javascript",
        `class Nixel {
	static hello() {
		return 'Hello World';
	}
}`,
      )
      .addTable([
        ["Nama", "Role"],
        ["Nixel", "Developer"],
        ["Fiora Sylvie", "Assistant"],
      ])
      .addSource([
        [
          "https://cdn.ornzora.eu.cc/dc85c945-96f7-4d50-aaa4-1dff7249aaf4-FIORA.jpg",
          "https://github.com/ValdazGT/",
          "GitHub",
        ],
        [
          "https://cdn.ornzora.eu.cc/dc85c945-96f7-4d50-aaa4-1dff7249aaf4-FIORA.jpg",
          "https://fiora.nixel.my.id/",
          "Fiora Sylvie",
        ],
      ])
      .addImage([
        "https://cdn.ornzora.eu.cc/d987ff9c-c16c-4f1e-a8d6-953e375f4aec-FIORA.jpg",
        "https://cdn.ornzora.eu.cc/db9578dd-01e4-47ba-8a14-4c20e2aa4f52-FIORA.jpg",
      ])
      .addReels([
        {
          title: "Nixel",
          profileIconUrl:
            "https://cdn.ornzora.eu.cc/4d2905ce-3707-4ec0-998a-68a3d851629f-FIORA.jpg",
          thumbnailUrl:
            "https://cdn.ornzora.eu.cc/d6b36500-3b7e-49ee-9123-52bb1bf106be-FIORA.jpg",
          videoUrl: "https://fiora.nixel.my.id/",
          reels_title: "Demo Reel",
          likes_count: 12000,
          shares_count: 500,
          view_count: 999999,
          reel_source: "IG",
          is_verified: true,
        },
        {
          title: "Nixel",
          profileIconUrl:
            "https://cdn.ornzora.eu.cc/4d2905ce-3707-4ec0-998a-68a3d851629f-FIORA.jpg",
          thumbnailUrl:
            "https://cdn.ornzora.eu.cc/fb402a04-3f96-49d1-b4e2-faebbbd4a22c-FIORA.jpg",
          videoUrl: "https://fiora.nixel.my.id/",
          reels_title: "Demo Reel",
          likes_count: 12000,
          shares_count: 500,
          view_count: 999999,
          reel_source: "IG",
          is_verified: true,
        },
      ])
      .send(jid);
  },
};
