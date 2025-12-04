import fs from "node:fs";
import path from "node:path";

function out(...p: string[]) {
  return path.join("static", ...p);
}

function readCache(fp: string) {
  if (!fs.existsSync(fp)) return null;
  const raw = fs.readFileSync(fp, "utf8");
  return JSON.parse(raw);
}

async function fetchJson(url: string, cacheFile: string): Promise<any> {
  const cached = readCache(cacheFile);
  if (cached) return cached;

  const r = await fetch(url);
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON from " + url);
  }

  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(json));
  return json;
}

async function pullWilayah() {
  fs.mkdirSync(out(), { recursive: true });

  const provRaw = await fetchJson(
    "https://wilayah.id/api/provinces.json",
    out("provinces.json"),
  );
  const prov = provRaw.data;

  const kabMap: Record<string, any[]> = {};
  for (const p of prov) {
    const f = out("kabupaten", `kab_${p.code}.json`);
    const kabRaw = await fetchJson(
      `https://wilayah.id/api/regencies/${p.code}.json`,
      f,
    );
    console.log(`Fetched kabupaten for provinsi ${p.name}`);
    kabMap[p.code] = kabRaw.data;
  }

  const kecMap: Record<string, any[]> = {};
  for (const p of prov) {
    const kabList = kabMap[p.code] || [];
    for (const kab of kabList) {
      const f = out("kecamatan", `kec_${kab.code}.json`);
      const kecRaw = await fetchJson(
        `https://wilayah.id/api/districts/${kab.code}.json`,
        f,
      );
      console.log(
        `Fetched kecamatan for kabupaten ${kab.name} provinsi ${p.name}`,
      );
      kecMap[kab.code] = kecRaw.data;
    }
  }

  for (const k in kecMap) {
    const kecList = kecMap[k];
    for (const kec of kecList) {
      const f = out("desa", `desa_${kec.code}.json`);
      await fetchJson(`https://wilayah.id/api/villages/${kec.code}.json`, f);

      console.log(`Fetched desa for kecamatan ${kec.name} code ${kec.code}`);
    }
  }
}

pullWilayah();
