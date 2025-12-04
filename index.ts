import { mkdir, writeFile, stat } from "node:fs/promises";
import type { Data } from "./types/data";
import type { Cuaca } from "./types/cuaca";

async function ensureDir(p: string) {
  await mkdir(p, { recursive: true }).catch(() => {});
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Collector)",
      Accept: "application/json",
    },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`HTTP ${r.status} on ${url}. ${t.slice(0, 200)}`);
  }
  return r.json();
}

async function fetchBmkg(url: string): Promise<any> {
  while (true) {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Collector)",
        Accept: "application/json",
      },
    });

    if (r.status === 429) {
      await sleep(1500 + Math.random() * 400);
      continue;
    }

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`HTTP ${r.status} on ${url}. ${t.slice(0, 200)}`);
    }

    return r.json();
  }
}

async function cacheValid(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    const age = Date.now() - s.mtimeMs;
    return age <= 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

async function main() {
  const provRaw = await fetchJson("https://wilayah.id/api/provinces.json");
  const daftarProv: Data[] = provRaw.data;

  await ensureDir("data");

  for (const prov of daftarProv) {
    const baseProv = `data/${prov.name}`;
    await ensureDir(baseProv);

    const kotaRaw = await fetchJson(
      `https://wilayah.id/api/regencies/${prov.code}.json`,
    );
    const daftarKota: Data[] = kotaRaw.data;

    for (const kota of daftarKota) {
      const baseKota = `${baseProv}/${kota.name}`;
      await ensureDir(baseKota);

      const kecRaw = await fetchJson(
        `https://wilayah.id/api/districts/${kota.code}.json`,
      );
      const daftarKec: Data[] = kecRaw.data;

      for (const kec of daftarKec) {
        const baseKec = `${baseKota}/${kec.name}`;
        await ensureDir(baseKec);

        const desaRaw = await fetchJson(
          `https://wilayah.id/api/villages/${kec.code}.json`,
        );
        const desaList: Data[] = desaRaw.data;

        for (const desa of desaList) {
          const out = `${baseKec}/${desa.name}.json`;
          const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${desa.code}`;

          const valid = await cacheValid(out);
          if (valid) {
            console.log(
              `Skip <1d: ${prov.name} / ${kota.name} / ${kec.name} / ${desa.name}`,
            );
            continue;
          }

          console.log(
            `Fetch: ${prov.name} / ${kota.name} / ${kec.name} / ${desa.name}`,
          );

          const jd = await fetchBmkg(url);
          const cuacaData: Cuaca[] = jd.data[0].cuaca;

          await writeFile(out, JSON.stringify(cuacaData, null, 2), {
            flag: "w",
          });

          await sleep(1200 + Math.random() * 300);
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
