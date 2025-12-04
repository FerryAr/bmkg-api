import { mkdir, writeFile, readFile } from "node:fs/promises";
import type { Data } from "./types/data";
import type { Cuaca } from "./types/cuaca";

async function ensureDir(p: string) {
  await mkdir(p, { recursive: true }).catch(() => {});
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadLocal(path: string) {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

async function fetchBmkg(url: string): Promise<any> {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Collector)",
      Accept: "application/json",
    },
  });

  if (r.status === 429) {
    await sleep(1500 + Math.random() * 400);
    return fetchBmkg(url);
  }

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`HTTP ${r.status} on ${url}. ${t.slice(0, 200)}`);
  }

  return r.json();
}

async function main() {
  const rawProv = await loadLocal("static/provinces.json");
  const daftarProv: Data[] = rawProv.data;

  await ensureDir("data");

  for (const prov of daftarProv) {
    const baseProv = `data/${prov.name}`;
    await ensureDir(baseProv);

    const rawKota = await loadLocal(`static/kabupaten/kab_${prov.code}.json`);

    const daftarKota: Data[] = rawKota.data;

    for (const kota of daftarKota) {
      const baseKota = `${baseProv}/${kota.name}`;
      await ensureDir(baseKota);

      const rawKec = await loadLocal(`static/kecamatan/kec_${kota.code}.json`);

      const daftarKec: Data[] = rawKec.data;

      for (const kec of daftarKec) {
        const baseKec = `${baseKota}/${kec.name}`;
        await ensureDir(baseKec);

        const rawList = await loadLocal(`static/desa/desa_${kec.code}.json`);
        const desaList: Data[] = rawList.data;

        for (const desa of desaList) {
          const out = `${baseKec}/${desa.name}.json`;
          const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${desa.code}`;

          const jd = await fetchBmkg(url);

          console.log(
            `Fetched cuaca for ${prov.name} / ${kota.name} / ${kec.name} / ${desa.name}`,
          );

          if (!jd?.data?.[0]?.cuaca) continue;

          const cuacaData: Cuaca[] = jd.data[0].cuaca;

          await writeFile(out, JSON.stringify(cuacaData, null, 2));
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
