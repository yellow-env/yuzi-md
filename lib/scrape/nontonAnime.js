import axios from "axios";
import * as cheerio from "cheerio";

class NontonAnimeAPI {
  constructor() {
    this.baseURL = "https://s9.nontonanimeid.boats";

    this.userAgents = [
      "Mozilla/5.0 Chrome/120",
      "Mozilla/5.0 Safari/537.36",
      "Mozilla/5.0 Linux Chrome/120",
    ];
  }

  getHeaders(referer = "") {
    return {
      accept: "*/*",
      "user-agent":
        this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
      referer: referer || this.baseURL,
    };
  }

  generateCookies() {
    const t = Date.now();
    return `_ga=GA1.2.${Math.floor(Math.random() * 1e9)}.${t}`;
  }

  async search(query) {
    const res = await axios.get(`${this.baseURL}/`, {
      params: { s: query },
      headers: {
        ...this.getHeaders(),
        cookie: this.generateCookies(),
      },
    });

    const $ = cheerio.load(res.data);
    const results = [];

    $(".as-anime-card").each((_, el) => {
      const $el = $(el);

      results.push({
        title: $el.find(".as-anime-title").text().trim(),
        url: $el.attr("href"),
        image: $el.find("img").attr("src"),
        rating: $el.find(".as-rating").text().replace("⭐", "").trim(),
      });
    });

    return results;
  }

  async getDetail(url) {
    const res = await axios.get(url, {
      headers: this.getHeaders(),
    });

    const $ = cheerio.load(res.data);

    return {
      title: $(".entry-title").text().trim(),
      image: $(".anime-card__sidebar img").attr("src"),
      score: $(".anime-card__score .value").text().trim(),
      synopsis: $(".synopsis-prose p").text().trim(),
    };
  }
}

export default new NontonAnimeAPI();
