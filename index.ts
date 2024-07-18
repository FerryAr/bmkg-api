import type { Cuaca } from "./types/cuaca";
import type { Lokasi } from "./types/lokasi";

import { mkdir, unlink } from "node:fs/promises";

const daftar_provinsi = [
    'aceh',
    'sumut',
    'sumbar',
    'riau',
    'jambi',
    'sumsel',
    'bengkulu',
    'lampung',
    'babel',
    'kepriau',
    'jakarta',
    'jawabarat',
    'jawatengah',
    'jogyakarta',
    'jawatimur',
    'banten',
    'bali',
    'ntt',
    'ntb',
    'kalbar',
    'kalteng',
    'kalsel',
    'kaltim',
    'kaluta',
    'sulut',
    'sulteng',
    'sulsel',
    'sultenggara',
    'gorontalo',
    'sulbar',
    'maluku',
    'malut',
    'papuabarat',
    'papua'
];

const kodeCuaca: { [key: string]: string } = {
    0: "Cerah",
    1: "Cerah Berawan",
    2: "Cerah Berawan",
    3: "Berawan",
    4: "Berawan Tebal",
    5: "Udara Kabur",
    100: "Cerah",
    101: "Cerah Berawan",
    102: "Cerah Berawan",
    103: "Berawan",
    104: "Berawan Tebal",
    10: "Asap",
    45: "Berkabut",
    60: "Hujan Ringan",
    61: "Hujan Sedang",
    63: "Hujan Lebat",
    80: "Hujan Lokal",
    95: "Hujan Petir",
    97: "Hujan Petir"
};

async function getDataKecamatan() {
    const dataKecamatan = await fetch("https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/CSV/kecamatan_geofeatures.csv");
    const dataKecamatanText = await dataKecamatan.text();
    const dataKecamatanSplit = dataKecamatanText.split('\n');
    const dataKecamatanJson = dataKecamatanSplit.map((item) => {
        const itemSplit = item.split(';');
        const kodeKecamatan = itemSplit[0];
        const namaKecamatan = itemSplit[1];
        const namaKabupaten = itemSplit[2];
        const namaProvinsi = itemSplit[3];
        const latitude = itemSplit[4];
        const longitude = itemSplit[5];
        return {
            kodeKecamatan,
            namaKecamatan,
            namaKabupaten,
            namaProvinsi,
            latitude,
            longitude
        } as Lokasi;
    });
    return dataKecamatanJson;
}

const dataKecamatanJson = await getDataKecamatan();

function getLokasiByKodeKecamatan(kodeKecamatan: string) {
    const lokasi = dataKecamatanJson.find((item) => item.kodeKecamatan === kodeKecamatan);

    if (lokasi) {
        return lokasi;
    } else {
        return {
            kodeKecamatan: kodeKecamatan,
            namaKecamatan: "",
            namaKabupaten: "",
            namaProvinsi: "",
            latitude: "",
            longitude: ""
        } as Lokasi;
    }
}


daftar_provinsi.forEach(async (provinsi) => {
    console.log("Mengambil data cuaca untuk provinsi " + provinsi.toUpperCase() + "...");

    const dataCsv = await fetch(`https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/CSV/kecamatanforecast-${provinsi}.csv`);
    const data = await dataCsv.text();
    const dataSplit = data.split('\n');
    const headers = dataSplit[0].split(';');
    const rows = dataSplit.slice(1);
    const dataJson = rows.map((item) => {
        const itemSplit = item.split(';');
        if(itemSplit.length !== headers.length) return null;

        const kodeKecamatan = itemSplit[0];
        const tanggal = itemSplit[1];
        const suhuMin = itemSplit[2] ? parseFloat(itemSplit[2]) : null;
        const suhuMax = itemSplit[3] ? parseFloat(itemSplit[3]) : null;
        const kelembapanMin = itemSplit[4] ? parseFloat(itemSplit[4]) : null;
        const kelembapanMax = itemSplit[5] ? parseFloat(itemSplit[5]) : null;
        const kelembapan = itemSplit[6] ? parseFloat(itemSplit[6]) : 0;
        const suhu = itemSplit[7] ? parseFloat(itemSplit[7]) : 0;
        const kodeCuaca = itemSplit[8] ? parseInt(itemSplit[8]) : 0;
        const arahAngin = itemSplit[9];
        const kecepatanAngin = itemSplit[10] ? parseInt(itemSplit[10]) : 0;
        
        return {
            kodeKecamatan,
            tanggal,
            suhuMin,
            suhuMax,
            kelembapanMin,
            kelembapanMax,
            kelembapan,
            suhu,
            kodeCuaca,
            arahAngin,
            kecepatanAngin
        };
    });

    // split data per kode kecamatan
    const dataPerKodeKecamatan: { [key: string]: Cuaca[] } = {};
    for (let i = 0; i < dataJson.length; i++) {
        const item = dataJson[i];
        if(item === null) continue;
        if (!dataPerKodeKecamatan[item.kodeKecamatan]) {
            dataPerKodeKecamatan[item.kodeKecamatan] = [];
        }
        dataPerKodeKecamatan[item.kodeKecamatan].push(item);
    }

    const dataPerKodeKecamatanArray = Object.keys(dataPerKodeKecamatan).map((kodeKecamatan) => {
        const lokasi = getLokasiByKodeKecamatan(kodeKecamatan);
        const cuaca: Cuaca[] = dataPerKodeKecamatan[kodeKecamatan].map((item) => {
            return {
                tanggal: item.tanggal,
                suhuMin: item.suhuMin,
                suhuMax: item.suhuMax,
                kelembapanMin: item.kelembapanMin,
                kelembapanMax: item.kelembapanMax,
                kelembapan: item.kelembapan,
                suhu: item.suhu,
                kodeCuaca: item.kodeCuaca,
                arahAngin: item.arahAngin,
                kecepatanAngin: item.kecepatanAngin
            };
        });
        return {
            kodeKecamatan,
            namaKecamatan: lokasi.namaKecamatan,
            namaKabupaten: lokasi.namaKabupaten,
            namaProvinsi: lokasi.namaProvinsi,
            latitude: lokasi.latitude,
            longitude: lokasi.longitude,
            data: cuaca
        };
    });

    dataPerKodeKecamatanArray.forEach(async (item) => {
        if (item.kodeKecamatan === "") return;
        if (item.data.length === 0) return;

        await mkdir(`./data`, { recursive: true });
        Bun.write(`./data/${item.kodeKecamatan}.json`, JSON.stringify(item)).then(() => {
            console.log(`File ${item.kodeKecamatan}.json berhasil dibuat`);
        }).catch((err) => {
            console.error(`File ${item.kodeKecamatan}.json gagal dibuat`);
            console.error(err);
        });
    });
});