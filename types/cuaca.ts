export interface Cuaca {
    tanggal: string;
    suhuMin?: number | null;
    suhuMax?: number | null;
    kelembapanMin?: number | null;
    kelembapanMax?: number | null;
    kelembapan: number;
    suhu: number;
    kodeCuaca: number;
    arahAngin: string;
    kecepatanAngin: number;
}
