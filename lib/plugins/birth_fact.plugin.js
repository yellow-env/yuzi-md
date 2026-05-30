import axios from "axios";
import chalk from "chalk";

function normalizeDate(input) {
  if (!input) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  const m = input.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (!m) return null;

  let [, d, mo, y] = m;

  if (y.length === 2) y = "20" + y;

  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const n = (x) =>
  x === undefined || x === null ? "-" : Number(x).toLocaleString("en-US");

export default {
  name: "Live Fact",
  command: ["livefact", "birthfact", "cekbirthfact"],
  category: "tools",

  async run(yuzi, msg, { jid, args }) {
    try {
      const input = args[0];

      if (!input) {
        return yuzi.sendMessage(
          jid,
          {
            text: "Masukkan tanggal lahir\nFormat: YYYY-MM-DD atau DD-MM-YY\nContoh: .livefact 2011-04-22",
          },
          { quoted: msg },
        );
      }

      const birthdate = normalizeDate(input);

      if (!birthdate) {
        return yuzi.sendMessage(
          jid,
          {
            text: "Format salah!\nGunakan:\nYYYY-MM-DD (2011-04-22)\natau DD-MM-YY (22-04-11)",
          },
          { quoted: msg },
        );
      }

      await yuzi.sendMessage(jid, {
        react: { text: "⏳", key: msg.key },
      });

      const api = `https://api.nexray.eu.cc/fun/livefunfact?birthdate=${birthdate}`;

      let data;
      try {
        const res = await axios.get(api);
        data = res.data;
      } catch (e) {
        return yuzi.sendMessage(
          jid,
          { text: "❌ API error / format tidak valid" },
          { quoted: msg },
        );
      }

      if (!data?.status) {
        return yuzi.sendMessage(
          jid,
          { text: "❌ Data tidak ditemukan" },
          { quoted: msg },
        );
      }

      const r = data.result;

      const text = `
╭─── ✦ LAPORAN FAKTA HIDUP ✦ ───╮
│ 📅 Tanggal Lahir : ${r.birth_date}
│ 🧾 Waktu Perhitungan : ${r.calculated_at}
│
│ ⚠️ Disclaimer Medis:
│  \`\`\`Data berbasis riset medis (Johns Hopkins, Mayo Clinic, Harvard, AHA)
│ Hasil dapat berbeda tergantung kondisi individu\`\`\`
╰─────────────────────────╯

╭─── *[ INFORMASI DASAR ]* ───╮
• Usia : ${r.basic_info.age_in_years} tahun
• Bulan : ${n(r.basic_info.age_in_months)}
• Minggu : ${n(r.basic_info.age_in_weeks)}
• Hari : ${n(r.basic_info.age_in_days)}
• Jam : ${n(r.basic_info.age_in_hours)}
• Menit : ${n(r.basic_info.age_in_minutes)}
• Detik : ${n(r.basic_info.age_in_seconds)}
╰─────────────────────╯

╭─── *[ SISTEM PERNAPASAN ]* ───╮
• Napas : ${n(r.respiratory.total_breaths)}
• Volume Udara : ${n(r.respiratory.total_air_volume_l)} L
• Oksigen Terpakai : ${n(r.respiratory.oxygen_consumed_l)} L
• CO₂ Dihasilkan : ${n(r.respiratory.co2_produced_l)} L
╰───────────────────────╯

╭─── *[ SISTEM KARDIOVASKULAR ]* ───╮
• Detak Jantung : ${n(r.cardiovascular.heart_beats_total)}
• Darah Dipompa : ${n(r.cardiovascular.blood_pumped_l)} L
• Jarak Aliran Darah : ${n(r.cardiovascular.blood_distance_km)} km
• Sel Darah Merah : ${n(r.cardiovascular.red_blood_cells_produced)}
╰──────────────────────────╯

╭─── *[ SISTEM SARAF ]* ───╮
• Transmisi Sinaps : ${n(r.neurological.synaptic_transmissions)}
• Potensi Aksi : ${n(r.neurological.action_potentials)}
• Energi Otak : ${n(r.neurological.brain_energy_consumed_kj)} kJ
• Pembentukan Memori : ${n(r.neurological.memory_consolidations)}
╰──────────────────╯

╭─── *[ SISTEM PENCERNAAN ]* ───╮
• Air Liur : ${n(r.digestive.saliva_produced_l)} L
• Cairan Lambung : ${n(r.digestive.gastric_juice_produced_l)} L
• Empedu : ${n(r.digestive.bile_produced_l)} L
• Penyerapan Nutrisi : ${n(r.digestive.nutrient_absorption_events)}
╰───────────────────────╯

╭─── *[ SISTEM GINJAL ]* ───╮
• Darah Difilter : ${n(r.renal.blood_filtered_l)} L
• Urine Diproduksi : ${n(r.renal.urine_produced_l)} L
• Racun Difilter : ${n(r.renal.toxins_filtered)}
╰───────────────────╯

╭─── *[ SISTEM IMUN ]* ───╮
• Sel Darah Putih : ${n(r.immune_system.white_cells_produced)}
• Patogen Dihancurkan : ${n(r.immune_system.pathogens_eliminated)}
• Regenerasi Kulit : ${n(r.immune_system.skin_cells_renewed)}
╰──────────────────╯

╭─── *[ AKTIVITAS SELULER ]* ───╮
• Sel Diganti : ${n(r.cellular_activity.cells_replaced)}
• ATP Dihasilkan : ${n(r.cellular_activity.atp_produced_moles)} mol
• Reaksi Metabolik : ${n(r.cellular_activity.metabolic_processes)}
╰───────────────────────╯

╭─── *[ SENSORIK ]* ───╮
• Kedipan Mata : ${n(r.sensory.eye_blinks)}
• Sinyal Visual : ${n(r.sensory.visual_signals_processed)}
• Suara Diproses : ${n(r.sensory.sounds_processed)}
╰──────────────╯

╭─── *[ METABOLISME ]* ───╮
• Kalori Terbakar : ${n(r.metabolic_summary.total_calories_burned)} kcal
• Oksigen Terpakai : ${n(r.metabolic_summary.oxygen_consumed_l)} L
• Panas Dihasilkan : ${n(r.metabolic_summary.heat_generated_kcal)} kcal
╰─────────────────╯

╭─── *[ FAKTA MENAKJUBKAN ]* ───╮
• Total Sel Tubuh : ${n(r.amazing_facts.total_body_cells)}
• Panjang DNA : ${n(r.amazing_facts.total_dna_length_km)} km
• Koneksi Neuron : ${n(r.amazing_facts.neuron_connections)}
• Panjang Pembuluh Darah : ${n(r.amazing_facts.blood_vessel_length_km)} km
• Kekuatan Otak : ${r.amazing_facts.brain_computing_power}
╰───────────────────────╯

╭─── *[ STATUS HIDUP ]* ───╮
• Harapan Hidup : ${r.life_comparison.world_life_expectancy} tahun
• Persentase Hidup : ${r.life_comparison.percentage_of_life_lived}%
• Sisa Perkiraan : ${r.life_comparison.estimated_remaining_years} tahun
• Status Biologis : ${r.life_comparison.biological_systems_optimal}
• Rasio Usia Sel : ${r.life_comparison.cellular_age_ratio}x
• Kematangan Fisiologis : ${r.life_comparison.physiological_maturity}
╰──────────────────╯
`;

      await yuzi.sendMessage(jid, { text }, { quoted: msg });

      await yuzi.sendMessage(jid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (err) {
      console.log(chalk.red("[-] [LIVEFACT]"), err);

      await yuzi.sendMessage(
        jid,
        { text: "❌ Error:\n" + err.message },
        { quoted: msg },
      );

      await yuzi.sendMessage(jid, {
        react: { text: "❌", key: msg.key },
      });
    }
  },
};
